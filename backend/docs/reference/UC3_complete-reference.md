# UC3: Inventory Management & Low-Stock Alerts — Complete Implementation

## Overview

**Use Case:** As an ops manager, I want to see current inventory levels and be alerted when products are low-stock, so I can reorder before we run out.

**Key Innovation:** Database-level atomicity (SERIALIZABLE + FOR UPDATE) prevents race conditions on inventory without distributed locks.

## What's Included

### 1. Inventory Service (`services/inventory_service.py`)

Core business logic with **atomic operations**.

**Key Classes:**
- `InventoryService` — Stock operations, checks, reservations, restocking
- `OutOfStockException` — Raised when insufficient inventory
- `RaceConditionException` — Raised on transaction conflicts

**Key Methods:**
```python
# Non-locking checks (for UI)
check_stock(db, product_id, quantity)
batch_check_stock(db, items)
get_inventory_levels(db)
get_inventory_for_product(db, product_id)

# Atomic operations (FOR UPDATE locks)
reserve_stock(db, product_id, quantity)  # Decrement stock atomically
batch_reserve_stock(db, items)  # All-or-nothing for multi-item orders
restock_product(db, product_id, quantity)  # Add inventory (ops only)

# Alerts
get_low_stock_alerts(db)  # Products below threshold
```

**Concurrency Safety:**
- Uses database-level FOR UPDATE locks
- SERIALIZABLE isolation prevents dirty reads
- Atomic UPDATE ensures stock never goes negative
- Transactions roll back on any failure (all-or-nothing)

### 2. API Endpoints (`api/inventory.py`)

FastAPI routes following OpenAPI spec.

**Public Endpoints (Ops-Only):**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/inventory` | List all product inventory |
| GET | `/api/inventory/low-stock` | Get low-stock alerts |
| PATCH | `/api/inventory/{id}` | Restock a product |

**Internal Endpoints (UC1 Integration):**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/inventory/_check-stock` | Verify stock (no lock) |
| POST | `/api/inventory/_reserve-stock` | Atomically reserve stock |

**Response Models:**
- `InventoryResponse` — Single inventory item
- `InventoryListResponse` — List of inventory
- `LowStockAlertResponse` — Low-stock alert
- `LowStockAlertListResponse` — List of alerts
- `RestockRequest` — Restock request body
- `ErrorResponse` — Error details

### 3. Low-Stock Monitoring (`alerts/low_stock_monitor.py`)

Real-time alert classification and reporting.

**Features:**
- Urgency classification (CRITICAL vs WARNING)
- Alert filtering and sorting
- Restock recommendations
- Webhook decision logic (prevent alert fatigue)

**Usage:**
```python
from uc3_inventory.alerts.low_stock_monitor import LowStockMonitor

# Get all alerts
alerts = LowStockMonitor.get_all_alerts(db)
# {critical: [...], warning: [...], all_alerts: [...]}

# Get only critical
critical = LowStockMonitor.get_critical_alerts(db)

# Should we send a webhook?
should_send = LowStockMonitor.should_trigger_webhook(db, last_webhook_time)

# Recommend restock amount
qty = LowStockMonitor.get_restock_recommendation(
    current_stock=3,
    threshold=10,
    urgency_factor=5  # Restock to 5x threshold
)
```

### 4. Comprehensive Tests (`tests/test_inventory_service.py`)

Unit tests covering:
- Stock checks (available/unavailable)
- Atomic reservations
- Batch operations (all-or-nothing)
- Low-stock alerts
- Restock operations
- Race condition prevention
- Error handling

**Run Tests:**
```bash
pytest backend/uc3-inventory/tests/ -v
```

### 5. Documentation

- **`CONCURRENCY_DESIGN.md`** — Deep dive into race-condition prevention
  - FOR UPDATE lock mechanism
  - SERIALIZABLE isolation semantics
  - Race-condition examples with timelines
  - Performance considerations
  
- **`INTEGRATION_GUIDE.md`** — Step-by-step integration with UC1
  - How to wire up routes
  - Database schema
  - Service method examples
  - Error handling patterns
  - Frontend integration
  - Monitoring & logging
  
- **`README.md`** (original) — Quick reference

## Architecture

### Database Schema

**Products Table:**
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

### Data Model (SQLAlchemy)

```python
class Product(Base):
    __tablename__ = "products"
    
    id: Column(Integer, primary_key=True)
    name: Column(String(255), nullable=False)
    stock: Column(Integer, nullable=False)
    low_stock_threshold: Column(Integer, default=10)
    updated_at: Column(DateTime, onupdate=datetime.utcnow)
```

## How It Works

### Stock Check (Informational)

**Scenario:** Customer browses product page

```
GET /products/1 → Check if in stock

1. SELECT product WHERE id=1  (no lock)
2. Check: product.stock >= requested_qty?
3. Return: {in_stock: true/false}

Use: Display "Add to Cart" or "Out of Stock" button
```

**No lock needed** — stock may change between check and purchase (acceptable UX)

### Stock Reserve (Atomic)

**Scenario:** Customer places order

```
POST /orders {customer_id, items, coupon_code}

1. BEGIN TRANSACTION (SERIALIZABLE isolation)
2. FOR UPDATE on all products (exclusive locks acquired)
3. Check: All items have sufficient stock?
4. If YES:
   - UPDATE products SET stock = stock - qty (all items)
   - INSERT orders, order_items
   - COMMIT (locks released, all changes persist)
5. If NO:
   - ROLLBACK (no changes, locks released)
   - Return 400 "Out of stock"
```

**Race-Condition Example:**

```
Two customers order last iPhone (stock=1)

Customer A                          Customer B
│                                   │
├─ BEGIN TRANSACTION                │
│                                   ├─ BEGIN TRANSACTION
│
├─ FOR UPDATE on iPhone             │
│  (lock acquired)                  │
│                                   ├─ FOR UPDATE on iPhone
│                                   │  (BLOCKED, waiting for A)
│
├─ Check: stock >= 1? YES (1 >= 1)  │
│                                   │
├─ UPDATE: stock = 0                │
│ INSERT order_id=100               │
│                                   │
├─ COMMIT (lock released)           │
│                                   ├─ FOR UPDATE acquired
│                                   │
│                                   ├─ Check: stock >= 1? NO (0 >= 1)
│                                   │
│                                   ├─ ROLLBACK
│                                   │ Return 400 "Out of stock"

Result:
✅ Customer A: ORDER SUCCEEDS (gets iPhone)
❌ Customer B: FAILS with clear error message

No overselling, deterministic outcome.
```

### Low-Stock Alerts

**Scenario:** Ops manager checks dashboard

```
GET /inventory/low-stock

1. Query: products WHERE stock < low_stock_threshold
2. For each product:
   - if stock <= threshold/2: urgency="critical"
   - else: urgency="warning"
3. Sort by urgency (critical first)
4. Return list with alerts

UI: Highlight critical items in red, warning in yellow
```

**Urgency Logic:**
| Condition | Urgency | Status | Action |
|-----------|---------|--------|--------|
| stock = 0 | CRITICAL | 🔴 | **Restock immediately** |
| stock <= threshold/2 | CRITICAL | 🔴 | **Restock immediately** |
| threshold/2 < stock < threshold | WARNING | 🟡 | Monitor, plan reorder |
| stock >= threshold | NORMAL | 🟢 | All good |

**Example:**
```
Widget B: threshold=10

stock=3  → 3 <= 5 → CRITICAL 🔴
stock=7  → 5 < 7 < 10 → WARNING 🟡
stock=12 → 12 >= 10 → NORMAL 🟢
```

### Restock Operation

**Scenario:** Ops manager restocks product

```
PATCH /inventory/1 {quantity: 50}

1. SELECT product WHERE id=1
2. product.stock += 50
3. UPDATE products SET stock = stock + 50, updated_at=NOW()
4. COMMIT
5. Return updated inventory

Result: Stock increased from 45 → 95
```

## Key Features

### ✅ Atomic Stock Operations

**No Race Conditions**
- FOR UPDATE locks ensure serial execution
- All-or-nothing transactions
- Stock never goes negative

**Example:**
```python
# Both transactions lock, serialize, and succeed/fail cleanly
result = InventoryService.batch_reserve_stock(db, [
    {product_id: 1, qty: 5},
    {product_id: 2, qty: 3}
])
```

### ✅ Low-Stock Alerts

**Real-Time Detection**
- Query runs on every inventory check
- Urgency classification (critical/warning)
- Sorted by severity

**Recommendations:**
```python
qty = LowStockMonitor.get_restock_recommendation(
    current_stock=3,
    threshold=10,
    urgency_factor=5  # Restock to 50 units (5x threshold)
)
```

### ✅ Integration with UC1

**Seamless Order Placement**
- UC1 calls `InventoryService.batch_reserve_stock()`
- Stock decremented atomically
- UC3 inventory automatically updated

**Error Handling:**
```python
try:
    InventoryService.batch_reserve_stock(db, items)
except OutOfStockException as e:
    return 400 {"error": "Out of stock", "details": str(e)}
```

### ✅ Comprehensive Logging

**Track All Operations**
```python
logger.info(f"Stock reserved: Product {id}, qty {qty}, new_stock {remaining}")
logger.warning(f"Out of stock: Product {id}, requested {qty}, available {stock}")
logger.info(f"Product restocked: {id}, +{qty} units")
```

### ✅ Production-Ready

**Database Constraints:**
```sql
ALTER TABLE products ADD CONSTRAINT check_stock_non_negative CHECK (stock >= 0);
```

**Connection Pooling:**
```python
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600
)
```

**Health Checks:**
```python
@app.get("/health/inventory")
async def health_check(db: Session = Depends(get_db)):
    try:
        InventoryService.get_inventory_levels(db)
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error"}, 503
```

## File Structure

```
backend/uc3-inventory/
├── __init__.py                      # Module exports
├── README.md                        # Quick reference
├── README_COMPLETE.md               # This file
├── CONCURRENCY_DESIGN.md            # Race-condition details
├── INTEGRATION_GUIDE.md             # Integration with UC1
│
├── services/
│   ├── __init__.py
│   └── inventory_service.py         # Core business logic
│           ├── InventoryService    # Main class
│           ├── OutOfStockException
│           └── RaceConditionException
│
├── api/
│   ├── __init__.py
│   └── inventory.py                 # FastAPI endpoints
│           ├── GET /inventory
│           ├── GET /inventory/low-stock
│           ├── PATCH /inventory/{id}
│           └── Internal endpoints for UC1
│
├── alerts/
│   ├── __init__.py
│   └── low_stock_monitor.py         # Alert logic
│           ├── LowStockMonitor
│           └── UrgencyLevel
│
└── tests/
    ├── __init__.py
    └── test_inventory_service.py    # Unit tests
            ├── TestCheckStock
            ├── TestReserveStock
            ├── TestBatchCheckStock
            ├── TestGetInventory
            ├── TestLowStockAlerts
            ├── TestRestockProduct
            └── TestRaceConditionPrevention
```

## Quick Integration Example

### 1. Enable Routes

```python
# backend/main.py
from uc3_inventory.api.inventory import router as uc3_inventory_router

app.include_router(uc3_inventory_router, prefix="/api")
```

### 2. Use in UC1

```python
# backend/uc1-browse-order/services/order_service.py
from uc3_inventory.services.inventory_service import InventoryService, OutOfStockException

def create_order(db: Session, request: CreateOrderRequest):
    try:
        db.begin()
        
        # Reserve stock (FOR UPDATE locks)
        InventoryService.batch_reserve_stock(db, request.items)
        
        # Create order
        order = Order(...)
        db.add(order)
        
        db.commit()
        return order
        
    except OutOfStockException as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
```

### 3. Use in Frontend

```javascript
// Check stock (informational)
const inStock = await fetch(`/api/inventory/_check-stock?product_id=1&qty=5`)
  .then(r => r.json())
  .then(d => d.in_stock);

// Get inventory for ops dashboard
const inventory = await fetch("/api/inventory")
  .then(r => r.json());

// Get low-stock alerts
const alerts = await fetch("/api/inventory/low-stock")
  .then(r => r.json());

// Restock product
const result = await fetch("/api/inventory/1", {
  method: "PATCH",
  body: JSON.stringify({quantity: 50})
});
```

## Testing

### Run All Tests

```bash
pytest backend/uc3-inventory/tests/ -v
```

### Test Coverage

```bash
pytest backend/uc3-inventory/tests/ --cov=backend.uc3_inventory --cov-report=html
```

### Specific Test Class

```bash
pytest backend/uc3-inventory/tests/test_inventory_service.py::TestRaceConditionPrevention -v
```

## Monitoring

### Key Metrics

```python
# Track order success rate
orders_attempted = Counter()
orders_succeeded = Counter()
out_of_stock_errors = Counter()

# Track inventory levels
inventory_level = Gauge("inventory_level", labels=["product_id"])

# Track operation latency
reserve_stock_duration = Histogram()
```

### Logs to Watch

```
INFO: Stock reserved: Product 1, qty 5, new_stock 45
WARNING: Out of stock: Product 2, requested 10, available 3
INFO: Product restocked: 1, +50 units
ERROR: Error reserving stock: [exception details]
```

## Deployment Checklist

- [ ] PostgreSQL 9.1+ with SERIALIZABLE support
- [ ] `products` table created with constraints
- [ ] Indexes on `id, stock` and `stock, low_stock_threshold`
- [ ] Connection pool configured (10-20 connections)
- [ ] Constraints enforcing `stock >= 0`
- [ ] Environment variables set
- [ ] Health checks configured
- [ ] Monitoring & logging enabled
- [ ] Load tests passed (concurrent orders)
- [ ] Database backups tested

## Common Issues & Solutions

### Issue: "Deadlock detected"
**Solution:** Order locks consistently (always product 1 before 2)

### Issue: "Lock wait timeout"
**Solution:** Increase pool size, reduce transaction time

### Issue: "Negative stock in database"
**Solution:** Add constraint, enforce InventoryService use

### Issue: "Stock check says available, but order fails"
**Solution:** Stock may change between check and reserve (normal, expected)

## See Also

- **`CONCURRENCY_DESIGN.md`** — Technical deep-dive into atomicity
- **`INTEGRATION_GUIDE.md`** — Step-by-step integration instructions
- **`api-contracts/openapi-spec.yaml`** — Full API specification
- **`backend/uc1-browse-order/`** — Order placement implementation
- **`backend/tests/`** — Integration test examples

## Summary

The UC3 Inventory Service provides:

1. **Atomic Stock Operations** — Database-level atomicity (FOR UPDATE + SERIALIZABLE)
2. **Race-Condition Safe** — No overselling, deterministic outcomes
3. **Low-Stock Alerts** — Real-time detection with urgency classification
4. **UC1 Integration** — Seamless inventory decrement on order placement
5. **Ops Dashboard** — View inventory levels and restock products
6. **Production-Ready** — Proper constraints, logging, error handling

**Key Innovation:** Uses PostgreSQL's native transaction semantics (no distributed locks needed).
