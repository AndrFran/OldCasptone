# UC3 Inventory Service: Integration Guide

## Quick Start

### 1. Enable UC3 Routes in Main App

**File:** `backend/main.py`

```python
from fastapi import FastAPI
from uc3_inventory.api.inventory import router as uc3_inventory_router

app = FastAPI(...)

# Add UC3 routes
app.include_router(uc3_inventory_router, prefix="/api", tags=["UC3-Inventory"])
```

### 2. Database Setup

**Ensure `products` table exists with:**
```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    low_stock_threshold INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_id_stock ON products(id, stock);
CREATE INDEX idx_products_low_stock ON products(stock, low_stock_threshold);
```

### 3. Import Service in UC1 (Order Placement)

**File:** `backend/uc1-browse-order/services/order_service.py`

```python
from uc3_inventory.services.inventory_service import InventoryService, OutOfStockException

async def create_order(db: Session, request: CreateOrderRequest):
    """Place order with atomic stock check"""
    
    try:
        # Begin transaction with SERIALIZABLE isolation
        db.begin()
        
        # Check all items in stock (pre-check, no lock)
        checks, error = InventoryService.batch_check_stock(db, request.items)
        if error:
            return 400 {"error": error}
        
        # Reserve stock (FOR UPDATE locks acquired)
        reservations = InventoryService.batch_reserve_stock(db, request.items)
        
        # Validate coupon
        coupon = UC2.validate_coupon(request.coupon_code) if request.coupon_code else None
        
        # Calculate totals
        subtotal = sum(item.price * item.qty for item in request.items)
        discount = coupon.apply(subtotal) if coupon else 0
        total = subtotal - discount
        
        # Create order
        order = Order(
            customer_id=request.customer_id,
            subtotal=subtotal,
            discount_amount=discount,
            total=total,
            coupon_code=request.coupon_code,
            status="pending"
        )
        db.add(order)
        db.flush()
        
        # Create order items
        for item in request.items:
            order_item = OrderItem(
                order_id=order.id,
                product_id=item.product_id,
                quantity=item.quantity,
                price=item.price,
                subtotal=item.price * item.quantity
            )
            db.add(order_item)
        
        # Update coupon usage
        if coupon:
            coupon.used_count += 1
            db.add(coupon)
        
        # Commit all changes atomically
        db.commit()
        
        return 201 {"order_id": order.id, "status": "pending", "total": total}
        
    except OutOfStockException as e:
        db.rollback()
        return 400 {"error": "Out of stock", "details": str(e)}
    except Exception as e:
        db.rollback()
        return 500 {"error": "Order creation failed"}
```

## API Endpoints

### Public Endpoints (Customer-Facing)

#### GET /api/inventory
**For:** Ops dashboard — view all inventory

**Response:**
```json
{
  "items": [
    {
      "product_id": 1,
      "product_name": "Widget A",
      "stock": 45,
      "low_stock_threshold": 10,
      "price": 29.99,
      "updated_at": "2026-07-23T10:10:00Z"
    }
  ],
  "total": 1
}
```

#### GET /api/inventory/low-stock
**For:** Ops dashboard — alert on low stock

**Response:**
```json
{
  "items": [
    {
      "product_id": 2,
      "product_name": "Widget B",
      "current_stock": 3,
      "low_stock_threshold": 10,
      "urgency": "critical",
      "updated_at": "2026-07-23T10:05:00Z"
    }
  ],
  "total": 1
}
```

#### PATCH /api/inventory/{product_id}
**For:** Ops manager — restock product

**Request:**
```json
{"quantity": 50}
```

**Response:**
```json
{
  "product_id": 1,
  "product_name": "Widget A",
  "stock": 95,
  "low_stock_threshold": 10,
  "price": 29.99,
  "updated_at": "2026-07-23T10:10:00Z"
}
```

### Internal Endpoints (UC1 Integration)

#### POST /api/inventory/_check-stock (Internal)
**For:** UC1 — check stock before order (informational, no lock)

**Query Params:**
```
?product_id=1&quantity=5
```

**Response:**
```json
{
  "product_id": 1,
  "available_stock": 50,
  "requested_qty": 5,
  "in_stock": true
}
```

#### POST /api/inventory/_reserve-stock (Internal)
**For:** UC1 — atomically reserve stock during order

**Query Params:**
```
?product_id=1&quantity=5
```

**Response:**
```json
{
  "product_id": 1,
  "reserved_qty": 5,
  "remaining_stock": 45,
  "updated_at": "2026-07-23T10:10:00Z"
}
```

**Errors:**
- 400: `OutOfStockException` — insufficient stock
- 409: `RaceConditionException` — conflict during transaction

## Service Methods

### Check Stock (Non-Locking)

```python
from uc3_inventory.services.inventory_service import InventoryService

result = InventoryService.check_stock(db, product_id=1, requested_qty=5)
# {product_id: 1, available_stock: 50, requested_qty: 5, in_stock: True}
```

### Reserve Stock (WITH Lock)

```python
try:
    result = InventoryService.reserve_stock(db, product_id=1, quantity=5)
    # {product_id: 1, reserved_qty: 5, remaining_stock: 45, ...}
    db.commit()
except OutOfStockException as e:
    db.rollback()
    # Handle insufficient stock
except RaceConditionException as e:
    db.rollback()
    # Handle conflict (retry logic)
```

### Batch Check Stock

```python
items = [
    {"product_id": 1, "quantity": 5},
    {"product_id": 2, "quantity": 3}
]

checks, error = InventoryService.batch_check_stock(db, items)
if error:
    print(f"Stock check failed: {error}")
else:
    print("All items in stock")
```

### Batch Reserve Stock (All-or-Nothing)

```python
items = [
    {"product_id": 1, "quantity": 5},
    {"product_id": 2, "quantity": 3}
]

try:
    reservations = InventoryService.batch_reserve_stock(db, items)
    db.commit()  # All items decremented atomically
except OutOfStockException:
    db.rollback()  # All items rolled back (partial failure = full rollback)
```

### Get Inventory Levels

```python
inventory = InventoryService.get_inventory_levels(db)
# [
#   {product_id: 1, product_name: "Widget A", stock: 50, ...},
#   {product_id: 2, product_name: "Widget B", stock: 3, ...}
# ]
```

### Get Low-Stock Alerts

```python
alerts = InventoryService.get_low_stock_alerts(db)
# [
#   {product_id: 2, product_name: "Widget B", current_stock: 3,
#    low_stock_threshold: 10, urgency: "critical"}
# ]
```

### Restock Product

```python
try:
    result = InventoryService.restock_product(db, product_id=1, quantity=50)
    db.commit()
    # {product_id: 1, product_name: "Widget A", stock: 100, ...}
except ValueError as e:
    db.rollback()
    # Handle invalid quantity or product not found
```

## Transaction Pattern

**Critical:** Proper transaction handling ensures atomicity.

### Pattern 1: UC1 Order Creation (Recommended)

```python
db.begin()  # BEGIN TRANSACTION

try:
    # All operations here are part of same transaction
    InventoryService.batch_reserve_stock(db, items)
    create_order_record(db, ...)
    db.commit()  # All succeed or all fail
except Exception:
    db.rollback()  # Undo everything
```

### Pattern 2: Context Manager

```python
from sqlalchemy import event

@contextmanager
def transaction(db):
    db.begin()
    try:
        yield db
        db.commit()
    except:
        db.rollback()
        raise

# Usage
with transaction(db) as session:
    InventoryService.batch_reserve_stock(session, items)
    create_order(session, ...)
```

### Pattern 3: Decorator

```python
def transactional(func):
    def wrapper(db, *args, **kwargs):
        try:
            result = func(db, *args, **kwargs)
            db.commit()
            return result
        except:
            db.rollback()
            raise
    return wrapper

@transactional
def create_order_atomic(db, request):
    InventoryService.batch_reserve_stock(db, items)
    create_order_record(db, ...)
```

## Error Handling

### OutOfStockException

```python
from uc3_inventory.services.inventory_service import OutOfStockException

try:
    InventoryService.reserve_stock(db, product_id=1, quantity=100)
except OutOfStockException as e:
    print(f"Product {e.product_id}: requested {e.requested}, available {e.available}")
    # Return 400 to client
```

### RaceConditionException

```python
from uc3_inventory.services.inventory_service import RaceConditionException

try:
    result = InventoryService.reserve_stock(...)
except RaceConditionException as e:
    # Implement retry logic
    time.sleep(0.1)  # Brief backoff
    retry()
```

## Frontend Integration

### Inventory Dashboard (Ops)

```javascript
// Get all inventory
const response = await fetch("/api/inventory");
const {items, total} = await response.json();

items.forEach(item => {
  console.log(`${item.product_name}: ${item.stock} units`);
});

// Get low-stock alerts
const alerts = await fetch("/api/inventory/low-stock");
const {items} = await alerts.json();

items.forEach(alert => {
  if (alert.urgency === "critical") {
    // Highlight in red
  }
});

// Restock
const response = await fetch(`/api/inventory/1`, {
  method: "PATCH",
  body: JSON.stringify({quantity: 50})
});
```

### Product Page (Customer)

```javascript
// Check if product in stock
const result = await fetch(`/api/inventory/_check-stock?product_id=1&quantity=1`);
const {in_stock} = await result.json();

if (in_stock) {
  // Show "Add to Cart" button
} else {
  // Show "Out of Stock" message
}

// Note: Stock may change between check and purchase
// Order placement validates again with FOR UPDATE lock
```

## Monitoring & Logging

### Metrics to Track

```python
import logging

logger = logging.getLogger(__name__)

# Log all stock operations
logger.info(f"Stock reserved: Product {product_id}, qty {quantity}, new_stock {remaining}")

# Log all failures
logger.warning(f"Stock unavailable: Product {product_id}, requested {qty}, available {stock}")

# Log restocks (ops actions)
logger.info(f"Product restocked: {product_id}, +{quantity} units")
```

### Prometheus Metrics

```python
from prometheus_client import Counter, Gauge

# Counters
orders_placed = Counter("orders_placed_total", "Total orders placed")
out_of_stock_errors = Counter("out_of_stock_errors_total", "Total out-of-stock errors")

# Gauges
inventory_level = Gauge("inventory_level", "Current stock level", ["product_id"])

# Usage
def reserve_stock(...):
    try:
        ...
        orders_placed.inc()
    except OutOfStockException:
        out_of_stock_errors.inc()
```

## Testing

### Unit Tests

```bash
pytest backend/uc3-inventory/tests/test_inventory_service.py -v
```

**Coverage:**
- Stock checks
- Stock reservations
- Low-stock alerts
- Restock operations
- Race condition prevention
- Batch operations

### Integration Tests

```python
# Test with real database
def test_order_with_stock_check(db, sample_product):
    """Full order flow with inventory"""
    
    # Start with 50 units
    assert sample_product.stock == 50
    
    # Reserve 30 units
    reservation = InventoryService.reserve_stock(db, sample_product.id, 30)
    db.commit()
    
    assert reservation["remaining_stock"] == 20
    
    # Verify database updated
    db.refresh(sample_product)
    assert sample_product.stock == 20
```

### Load Testing

```bash
# Simulate 100 concurrent orders for last 5 units
ab -n 100 -c 10 -p order.json http://localhost:8000/api/orders
```

**Expected:** ~5 succeed, ~95 fail with 400 Out of Stock

## Deployment

### Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@host:5432/vibestrike
INVENTORY_TRANSACTION_TIMEOUT=30  # seconds
INVENTORY_LOG_LEVEL=INFO
```

### Database Connection Pool

```python
# backend/shared/db.py
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=3600
)
```

### Health Check

```python
# Add to main.py
@app.get("/health/inventory")
async def inventory_health(db: Session = Depends(get_db)):
    """Check inventory service health"""
    try:
        # Test database connection
        InventoryService.get_inventory_levels(db)
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "message": str(e)}, 503
```

## Troubleshooting

### Issue: "Operation timed out" on stock reserve

**Cause:** Lock contention (too many concurrent orders)

**Solution:**
1. Increase database connection pool size
2. Implement queue system (Redis) to throttle orders
3. Scale database (better hardware, read replicas)

### Issue: Negative stock appears in database

**Cause:** Missing constraint or FOR UPDATE not used

**Solution:**
```sql
ALTER TABLE products ADD CONSTRAINT check_stock_non_negative CHECK (stock >= 0);
-- Force all code through InventoryService (no direct SQL)
```

### Issue: Orders succeeding with 0 stock

**Cause:** SERIALIZABLE isolation not enabled

**Solution:**
```python
# Force SERIALIZABLE for order transactions
db.execute("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE")
db.begin()
```

## See Also

- `CONCURRENCY_DESIGN.md` — Deep dive into race-condition prevention
- `backend/uc3-inventory/tests/` — Unit test examples
- `backend/uc1-browse-order/` — Order placement integration
- `api-contracts/openapi-spec.yaml` — Full API specification
