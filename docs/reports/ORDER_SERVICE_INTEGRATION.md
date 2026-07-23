# Order Service Integration Guide for All UC Teams

## Quick Start

### For Frontend Teams (UC1, UC4)

1. **Place Order Endpoint**
   ```javascript
   // POST /orders
   const response = await fetch('/api/orders', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
           customer_id: 1,
           items: [
               { product_id: 10, quantity: 2 },
               { product_id: 15, quantity: 1 }
           ],
           coupon_code: 'SUMMER20'  // optional
       })
   });
   
   if (response.status === 201) {
       const order = await response.json();
       // Order created successfully
       console.log(`Order ${order.id}: $${order.total}`);
   } else if (response.status === 409) {
       // Out of stock
       const error = await response.json();
       console.error('Out of stock:', error.detail);
   }
   ```

2. **Get Order Status**
   ```javascript
   // GET /orders/{order_id}
   const response = await fetch(`/api/orders/42`);
   const order = await response.json();
   console.log(`Order status: ${order.status}`);
   ```

3. **Get Customer Order History**
   ```javascript
   // GET /customers/{customer_id}?skip=0&limit=100
   const response = await fetch(`/api/customers/1?limit=10`);
   const { items: orders, total } = await response.json();
   console.log(`Customer has ${total} orders`);
   ```

4. **Update Order Status (Ops Only)**
   ```javascript
   // PATCH /orders/{order_id}/status
   const response = await fetch(`/api/orders/42/status`, {
       method: 'PATCH',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ status: 'confirmed' })
   });
   ```

### For Backend Teams (UC1, UC2, UC3, UC4)

1. **Import Order Service**
   ```python
   from services.order_service import OrderService
   from shared.exceptions import OutOfStockError, CouponValidationError
   ```

2. **Use in Endpoints**
   ```python
   @app.post("/orders")
   def create_order(request: CreateOrderRequest, db: Session = Depends(get_db)):
       try:
           order = OrderService.create_order(
               db,
               customer_id=request.customer_id,
               items=request.items,
               coupon_code=request.coupon_code
           )
           return order
       except OutOfStockError as e:
           return {"error": str(e)}, 409
   ```

## Service Architecture

```
Order Service (UC1 + UC4)
│
├─ UC2 Integration
│  └─ _apply_coupon() validates & applies discount
│
├─ UC3 Integration
│  └─ Stock decremented atomically in same transaction
│
└─ UC4 Integration
   └─ Order status tracking and history retrieval
```

## API Endpoints

### Create Order (UC1)
```
POST /orders
Status: 201 Created
Integrates: UC2 (coupon), UC3 (stock), UC4 (record)
```

### Get Order (UC4)
```
GET /orders/{order_id}
Status: 200 OK
Used by: Frontend (status page), Ops dashboard
```

### Get Customer Orders (UC4)
```
GET /customers/{customer_id}?skip=0&limit=100
Status: 200 OK
Used by: Frontend (order history), Ops (customer lookup)
```

### Update Order Status (UC4 - Ops)
```
PATCH /orders/{order_id}/status
Status: 200 OK
Requires: Ops manager role
Used by: Operations team
```

### Get Orders by Status (UC4 - Ops)
```
GET /orders/status/{status}?skip=0&limit=50
Status: 200 OK
Used by: Ops dashboard (order queue)
```

## Database Schema

All three tables are REQUIRED:

### products table
```sql
id SERIAL PRIMARY KEY
name VARCHAR(255) NOT NULL
price DECIMAL(10,2) NOT NULL CHECK (price > 0)
stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0)
low_stock_threshold INTEGER DEFAULT 10
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

**Critical Index (for race condition prevention):**
```sql
CREATE INDEX idx_products_id_stock ON products(id, stock);
```

### orders table
```sql
id SERIAL PRIMARY KEY
customer_id INTEGER NOT NULL REFERENCES customers(id)
status VARCHAR(50) DEFAULT 'pending'
subtotal DECIMAL(10,2) DEFAULT 0
discount_amount DECIMAL(10,2) DEFAULT 0
total DECIMAL(10,2) DEFAULT 0
coupon_code VARCHAR(50) NULL
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

**Indexes:**
```sql
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
```

### order_items table
```sql
id SERIAL PRIMARY KEY
order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE
product_id INTEGER NOT NULL REFERENCES products(id)
quantity INTEGER NOT NULL CHECK (quantity > 0)
price DECIMAL(10,2) NOT NULL
subtotal DECIMAL(10,2) NOT NULL
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

**Index:**
```sql
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

### coupons table (for UC2 integration)
```sql
id SERIAL PRIMARY KEY
code VARCHAR(50) UNIQUE NOT NULL
description TEXT
discount_type VARCHAR(20) NOT NULL  -- 'percent' or 'fixed'
value DECIMAL(10,2) NOT NULL CHECK (value > 0)
expires_at TIMESTAMP NOT NULL
max_uses INTEGER NULL  -- NULL = unlimited
used_count INTEGER DEFAULT 0
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

**Indexes:**
```sql
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_expires_at ON coupons(expires_at);
```

## Error Codes & Meanings

| Status | Error Type | Cause |
|--------|-----------|-------|
| 201 | Order Created | Successful order placement |
| 400 | Bad Request | Invalid customer_id, missing items, duplicate products, invalid status |
| 404 | Not Found | Product, Customer, or Order doesn't exist |
| 409 | Conflict | Out of stock (race condition safety) |
| 500 | Server Error | Unexpected error (check logs) |

## Response Schema

### Order Response
```json
{
    "id": 42,
    "customer_id": 1,
    "status": "pending",
    "items": [
        {
            "id": 101,
            "product_id": 10,
            "quantity": 2,
            "price": "50.00",
            "subtotal": "100.00",
            "created_at": "2025-07-23T10:30:00Z"
        }
    ],
    "subtotal": "100.00",
    "discount_amount": "10.00",
    "total": "90.00",
    "coupon_code": "WELCOME10",
    "created_at": "2025-07-23T10:30:00Z",
    "updated_at": "2025-07-23T10:30:00Z"
}
```

### OrderList Response
```json
{
    "items": [
        {...order...},
        {...order...}
    ],
    "total": 42
}
```

## Race Condition Prevention

**What is it?**
Two customers buying the last item simultaneously. Without proper locking, both could succeed (overselling).

**How Order Service prevents it:**
1. BEGIN TRANSACTION (SERIALIZABLE isolation)
2. SELECT product FOR UPDATE (exclusive row lock)
3. Check stock >= qty
4. UPDATE stock (atomic decrement)
5. COMMIT (lock released)

**Result:** Only one succeeds, other gets OutOfStockError (409)

**Visual:**
```
Request A          Request B
│                  │
└─ FOR UPDATE ──┬──┘  (Both want lock)
   Lock gained ←─┘
   stock=1 >=1 ✓
   stock=0
   COMMIT (lock released)
              └─ FOR UPDATE now acquired
                 stock=0 >=1 ✗
                 OutOfStockError → ROLLBACK
```

## Transaction Isolation

Order Service uses SERIALIZABLE isolation at the database level:

```sql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

SELECT * FROM products WHERE id = 10 FOR UPDATE;
-- Exclusive lock acquired on product row

UPDATE products SET stock = stock - 1 WHERE id = 10;
INSERT INTO orders (...) VALUES (...);
INSERT INTO order_items (...) VALUES (...);

COMMIT;
-- Lock released, all changes persistent
```

**Key Property:** If two transactions conflict (both modifying same row), database detects and aborts one with SERIALIZATION_FAILURE error.

Order Service handles this by wrapping in try/except and rolling back on any exception.

## Coupon Integration (UC2)

Order Service automatically:

1. **Validates coupon**
   - Exists in database
   - Not expired (expires_at > now)
   - Within usage limit (used_count < max_uses or max_uses=NULL)

2. **Calculates discount**
   - Percent: `discount = subtotal * (value / 100)`
   - Fixed: `discount = value`

3. **Applies discount**
   - Clamps to subtotal (no negative totals)
   - Sets order.discount_amount
   - Updates order.total

4. **Increments usage**
   - Atomically increments coupon.used_count
   - Within same transaction (all-or-nothing)

**UC2 Team:** You only need to:
- Provide coupon validation in database (Order Service calls it)
- Pre-populate coupons table with valid codes
- Monitor coupon usage via dashboard

## Inventory Decrement (UC3)

Order Service automatically decrements stock:

1. **During order creation**
   - SELECT product FOR UPDATE (lock)
   - Check stock >= qty
   - UPDATE product SET stock = stock - qty

2. **Atomically**
   - Within same transaction
   - No race conditions
   - No separate UC3 service call needed

**UC3 Team:** You focus on:
- Low-stock alerts (query products WHERE stock < threshold)
- Restock operations (UPDATE products SET stock = stock + qty)
- Inventory history/audit log
- Monitor via dashboard

Stock is always synchronized because it's decremented in the same transaction as order creation.

## Status Tracking (UC4)

Order Service maintains order status state machine:

```
pending (initial)
   ↓
confirmed (after payment/verification)
   ↓
shipped (ready for delivery)
   ↓
delivered (final)
```

**UC4 Team:** You handle:
1. **Tracking Page**: GET /orders/{order_id} → display current status
2. **Order History**: GET /customers/{customer_id} → list past orders
3. **Ops Dashboard**: GET /orders/status/{status} → queue management
4. **Status Updates**: PATCH /orders/{order_id}/status → confirm, ship, deliver

All status validation is done by Order Service (invalid transitions rejected).

## Testing Checklist

### Unit Tests
- [ ] Create order with valid items
- [ ] Create order with coupon
- [ ] Out of stock error
- [ ] Invalid coupon error
- [ ] Customer not found error
- [ ] Invalid status transition error
- [ ] Get order by ID
- [ ] Get customer orders
- [ ] Update order status

### Integration Tests
- [ ] End-to-end order flow
- [ ] Stock decremented after order
- [ ] Coupon usage incremented
- [ ] Order queryable via GET endpoints
- [ ] Status transitions enforced

### Load Tests
- [ ] 100 concurrent orders on same product → 1 succeeds, 99 fail
- [ ] 100 concurrent orders on different products → all succeed
- [ ] Response time < 500ms for create order

## Common Issues & Solutions

### Issue: OutOfStockError when stock available

**Cause:** Race condition detected mid-transaction

**Solution:** Retry order placement (exponential backoff)

```python
import time
retries = 0
max_retries = 3

while retries < max_retries:
    try:
        order = OrderService.create_order(db, ...)
        break
    except OutOfStockError:
        retries += 1
        if retries < max_retries:
            time.sleep(2 ** retries)  # exponential backoff
        else:
            raise
```

### Issue: Coupon not applying to order

**Cause:** Coupon expired or usage limit reached

**Solution:** Check coupon.expires_at and coupon.used_count before creating order

```python
from shared.models import Coupon

coupon = db.query(Coupon).filter_by(code='SUMMER20').first()
if coupon and coupon.is_valid():
    # Safe to use
    order = OrderService.create_order(..., coupon_code='SUMMER20')
else:
    # Show user: "Coupon expired or no longer available"
```

### Issue: Order status cannot transition to shipped

**Cause:** Current status is not 'confirmed'

**Solution:** Ensure status progression: pending → confirmed → shipped

```python
# Invalid
OrderService.update_order_status(db, order_id=42, new_status='shipped')
# Error: Cannot transition from 'pending' to 'shipped'

# Correct
OrderService.update_order_status(db, order_id=42, new_status='confirmed')
OrderService.update_order_status(db, order_id=42, new_status='shipped')
```

## File Structure

```
backend/
├── shared/
│   ├── models.py         ← Order, OrderItem, Product, Customer, Coupon models
│   ├── schemas.py        ← Pydantic request/response schemas
│   ├── exceptions.py     ← All custom exceptions
│   └── db.py             ← Database connection
├── services/
│   └── order_service.py  ← OrderService class (atomic logic)
├── api/
│   └── orders.py         ← API routes/endpoints
└── main.py               ← FastAPI app (include router)
```

## How to Add to Main App

In `backend/main.py`:

```python
from api.orders import router as orders_router

# Include the orders router
app.include_router(orders_router, prefix="/api", tags=["Orders"])
```

Then restart the app:

```bash
python -m backend.main
# or
uvicorn backend.main:app --reload
```

API will be available at:
- POST /api/orders
- GET /api/orders/{order_id}
- GET /api/customers/{customer_id}
- PATCH /api/orders/{order_id}/status
- GET /api/orders/status/{status}

OpenAPI docs at: http://localhost:8000/docs

## Support

- **Technical questions:** Refer to `backend/services/README.md`
- **Integration questions:** Refer to this file
- **API documentation:** Visit `http://localhost:8000/docs` (Swagger UI)
- **Example code:** See `backend/api/orders.py` for endpoint implementations

## Implementation Checklist

- [ ] Database tables created (products, customers, orders, order_items, coupons)
- [ ] Indexes created (idx_products_id_stock, idx_orders_customer_id, idx_orders_status)
- [ ] Order Service imported in main.py
- [ ] Orders router included in FastAPI app
- [ ] Environment variables configured (.env)
- [ ] Test data seeded (products, customers, coupons)
- [ ] Health check endpoint working
- [ ] OpenAPI docs accessible at /docs
- [ ] Manual testing: Create order successfully
- [ ] Manual testing: Out of stock error
- [ ] Manual testing: Coupon discount applied
- [ ] Manual testing: Status transition validated
- [ ] Load testing: Race condition prevention verified
- [ ] Monitoring/logging configured
