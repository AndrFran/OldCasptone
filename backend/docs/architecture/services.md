# Order Service Documentation

## Overview

The **Order Service** is the critical path for UC1 (Browse & Order) and UC4 (Order Tracking). It implements:

1. **Atomic Order Placement** - SERIALIZABLE isolation + FOR UPDATE locks prevent race conditions
2. **Coupon Integration** - Seamless validation and discount application with UC2
3. **Order Status Tracking** - State machine with validated transitions
4. **Customer Order History** - Paginated retrieval with filtering

## Architecture

```
Frontend
   ↓
POST /orders (UC1 API)
   ↓
OrderService.create_order()
   ├─ Verify customer exists
   ├─ SELECT products FOR UPDATE (acquire exclusive locks)
   ├─ Validate stock for all items (all-or-nothing)
   ├─ Atomic UPDATE products (decrement stock) ← Race condition prevention
   ├─ INSERT order master record
   ├─ INSERT order_items (price snapshots)
   ├─ Validate & apply coupon (UC2 integration)
   ├─ UPDATE order totals
   └─ COMMIT (all-or-nothing atomicity)
        ↓
UC2: Discount applied ✓
UC3: Stock decremented ✓
UC4: Order queryable ✓
```

## Key Features

### 1. Race Condition Prevention

**Scenario:** 2 concurrent requests for last unit (stock=1)

```
T1: BEGIN TRANSACTION (SERIALIZABLE)
T2: BEGIN TRANSACTION (SERIALIZABLE)

T1: SELECT products WHERE id=X FOR UPDATE (lock acquired)
T2: SELECT products WHERE id=X FOR UPDATE (blocked, waiting)

T1: stock=1 >= qty=1 ✓
T1: UPDATE products SET stock=0
T1: COMMIT (lock released)

T2: FOR UPDATE now acquired
T2: stock=0 >= qty=1 ✗
T2: OutOfStockError → ROLLBACK

Result: Only T1 succeeds, atomicity guaranteed
```

**Technical Details:**
- `FOR UPDATE` acquires exclusive locks on selected rows
- Lock held until transaction COMMIT/ROLLBACK
- SERIALIZABLE isolation prevents phantom reads
- No distributed locks needed (database handles atomicity)

### 2. Coupon Integration with UC2

Order Service automatically:
1. Validates coupon existence and expiry
2. Checks usage limits (max_uses, used_count)
3. Calculates discount (percent or fixed)
4. Increments coupon usage counter
5. Clamps discount to subtotal (no negative totals)

Supported discount types:
- **Percent:** `discount = subtotal * (value / 100)`
- **Fixed:** `discount = value`

### 3. Order Status State Machine

Valid transitions:
```
pending
   ↓
confirmed
   ↓
shipped
   ↓
delivered (terminal)
```

All other transitions rejected with `InvalidStatusTransitionError`.

## API Contract

### Create Order

```
POST /orders
Content-Type: application/json
X-Idempotency-Key: uuid (optional, future idempotency)

{
    "customer_id": 1,
    "items": [
        {"product_id": 10, "quantity": 2},
        {"product_id": 15, "quantity": 1}
    ],
    "coupon_code": "SUMMER20"  // optional
}
```

**Response (201 Created):**
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
        },
        {
            "id": 102,
            "product_id": 15,
            "quantity": 1,
            "price": "49.99",
            "subtotal": "49.99",
            "created_at": "2025-07-23T10:30:00Z"
        }
    ],
    "subtotal": "149.99",
    "discount_amount": "30.00",
    "total": "119.99",
    "coupon_code": "SUMMER20",
    "created_at": "2025-07-23T10:30:00Z",
    "updated_at": "2025-07-23T10:30:00Z",
    "message": "Order created successfully"
}
```

**Error Responses:**

1. **400 Bad Request** - Invalid data
   ```json
   {
       "detail": "Order must contain at least one item"
   }
   ```

2. **404 Not Found** - Product/Customer not found
   ```json
   {
       "detail": "Product 999 not found"
   }
   ```

3. **409 Conflict** - Out of stock (race condition safety)
   ```json
   {
       "detail": "Product 'Elite Shoes' only has 0 in stock, requested 1"
   }
   ```

4. **400 Bad Request** - Invalid coupon
   ```json
   {
       "detail": "Coupon 'INVALID' not found"
   }
   ```

### Get Order

```
GET /orders/{order_id}
```

**Response (200 OK):**
Same structure as Create Order response

**Error:**
- **404 Not Found:** Order doesn't exist

### Get Customer Orders

```
GET /customers/{customer_id}?skip=0&limit=100
```

**Response (200 OK):**
```json
{
    "items": [
        {...order object...},
        {...order object...}
    ],
    "total": 5
}
```

**Error:**
- **404 Not Found:** Customer doesn't exist

### Update Order Status

```
PATCH /orders/{order_id}/status
Content-Type: application/json

{
    "status": "confirmed"
}
```

**Valid statuses:**
- `pending`
- `confirmed`
- `shipped`
- `delivered`

**Response (200 OK):**
Order object with updated status

**Errors:**
- **400 Bad Request:** Invalid status or invalid transition
- **404 Not Found:** Order not found

### Get Orders by Status (Ops)

```
GET /orders/status/{status}?skip=0&limit=50
```

**Response (200 OK):**
```json
{
    "items": [...],
    "total": 3
}
```

## Database Schema Integration

### Products Table
```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    low_stock_threshold INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Index for FOR UPDATE locking
    INDEX idx_products_id_stock (id, stock)
);
```

### Orders Table
```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    subtotal DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0,
    coupon_code VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_orders_customer_id (customer_id),
    INDEX idx_orders_status (status)
);
```

### Order Items Table
```sql
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_items_order_id (order_id)
);
```

## Integration with Other UCs

### UC2 (Promotions & Discounts)
- Order Service calls `_apply_coupon()` during order creation
- Validates coupon existence, expiry, usage limits
- Calculates discount (percent or fixed)
- Increments coupon usage counter atomically

### UC3 (Inventory)
- Product stock decremented atomically during order creation
- No separate inventory service call needed (atomic UPDATE in transaction)
- Inventory levels immediately reflect in UC3 queries

### UC4 (Tracking)
- Order created and immediately queryable
- Status starts as `pending`
- UC4 can update status and retrieve order history

## Error Handling

### Custom Exceptions

All exceptions inherit from `BaseAPIException` and return appropriate HTTP status codes:

```python
class OutOfStockError(BaseAPIException):
    # Status: 409 Conflict
    # Raised: Stock < requested quantity

class ProductNotFoundError(BaseAPIException):
    # Status: 404 Not Found
    # Raised: Product ID doesn't exist

class CustomerNotFoundError(BaseAPIException):
    # Status: 404 Not Found
    # Raised: Customer ID doesn't exist

class CouponValidationError(BaseAPIException):
    # Status: 400 Bad Request
    # Raised: Coupon invalid, expired, or limit exceeded

class InvalidStatusTransitionError(BaseAPIException):
    # Status: 400 Bad Request
    # Raised: Status transition not allowed
```

## Performance Considerations

### Locking Strategy
- **FOR UPDATE** locks only the rows being modified (row-level locking)
- Transactions are short (seconds) → minimal contention
- Index on `(id, stock)` optimizes lock acquisition

### Concurrency
- Multiple orders on different products: **concurrent** ✓
- Multiple orders on same product (with stock): **serialized by lock** (fair queue)
- Orders on same product (insufficient stock): **one succeeds, others fail fast** ✓

### Optimization Opportunities
- **Batch ordering:** Multiple items in single transaction (reduces locks)
- **Connection pooling:** Fast lock release via quick COMMIT
- **Indexing:** `idx_products_id_stock` for fast FOR UPDATE

## Testing Strategy

### Unit Tests

```python
def test_create_order_success():
    """Order created with valid items and stock"""
    
def test_create_order_out_of_stock():
    """OutOfStockError raised when stock < qty"""
    
def test_create_order_with_coupon():
    """Discount applied correctly (percent and fixed)"""
    
def test_race_condition_prevention():
    """Two concurrent requests: one succeeds, one fails (not oversell)"""
    
def test_invalid_status_transition():
    """Status transitions validated (e.g., pending→shipped rejected)"""
    
def test_customer_order_history():
    """Paginated order retrieval works correctly"""
```

### Integration Tests

```python
def test_order_flow_end_to_end():
    """Customer → Place Order → Get Status → Update Status → Delivered"""
    
def test_stock_decremented_after_order():
    """UC3 sees reduced stock after order creation"""
    
def test_coupon_incremented_after_order():
    """UC2 coupon usage_count incremented atomically"""
```

### Load Testing

```bash
# Simulate 100 concurrent requests for last unit
ab -n 100 -c 100 \
  -p order_payload.json \
  http://localhost:8000/orders

# Expected: ~1 success, 99 OutOfStockError (or similar ratio)
```

## Deployment Checklist

- [ ] Database connection configured in `.env`
- [ ] PostgreSQL SERIALIZABLE isolation level set
- [ ] Connection pooling configured (min 5, max 20)
- [ ] Indexes created on `products(id, stock)`
- [ ] Coupon table populated with test data
- [ ] Customer table seeded with test customers
- [ ] Product catalog seeded with test products
- [ ] Health check endpoint accessible
- [ ] OpenAPI docs available at `/docs`
- [ ] Error handling verified (test OutOfStockError manually)
- [ ] Load test with concurrent orders
- [ ] Monitoring/logging in place

## Future Enhancements

1. **Idempotency:** Add `X-Idempotency-Key` header to prevent double-charging on retries
2. **Partial Orders:** Allow overselling with backorder queue
3. **Order Modifications:** Allow adding/removing items before confirmation
4. **Cancellation:** Add order cancellation with stock refund
5. **Analytics:** Track order metrics (avg value, conversion rate, popular products)
6. **Notifications:** Email/SMS on status updates (UC4 integration)
7. **Payment Integration:** Add payment processor (Stripe, PayPal)
8. **Inventory Reservation:** Reserve stock for 10 min after order creation

## Code Examples

### Create Order with Coupon

```python
from services.order_service import OrderService

# Create order with 20% discount coupon
order = OrderService.create_order(
    db,
    customer_id=1,
    items=[
        {"product_id": 10, "quantity": 2},
        {"product_id": 15, "quantity": 1}
    ],
    coupon_code="SUMMER20"
)

print(f"Order {order.id} created")
print(f"Subtotal: ${order.subtotal}")
print(f"Discount: ${order.discount_amount}")
print(f"Total: ${order.total}")
```

### Handle Race Condition

```python
from services.order_service import OrderService
from shared.exceptions import OutOfStockError

try:
    order = OrderService.create_order(db, customer_id=1, items=[...])
except OutOfStockError as e:
    # Show user: "Sorry, product is out of stock"
    return {"error": str(e)}, 409
```

### Update Order Status

```python
order = OrderService.update_order_status(db, order_id=42, new_status="shipped")
# Status: pending → confirmed → shipped → delivered
```

## Glossary

- **SERIALIZABLE:** Isolation level preventing dirty reads, non-repeatable reads, phantom reads
- **FOR UPDATE:** Row lock ensuring exclusive access until transaction commits
- **Atomicity:** All-or-nothing guarantee (all steps succeed or all rollback)
- **Race Condition:** Multiple concurrent requests accessing shared resource (stock)
- **Overselling:** Selling more units than available in stock
- **Price Snapshot:** Price captured at order time (protects against price changes)
