# Order Service - Quick Reference Card

## One-Page API Reference

### Create Order (UC1)
```bash
curl -X POST http://localhost:8000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [{"product_id": 10, "quantity": 2}],
    "coupon_code": "SUMMER20"
  }'
```
**Status:** 201 (success) | 400 (validation) | 404 (not found) | 409 (out of stock)

---

### Get Order (UC4)
```bash
curl http://localhost:8000/api/orders/42
```
**Status:** 200 (OK) | 404 (not found)

---

### Get Customer Orders (UC4)
```bash
curl "http://localhost:8000/api/customers/1?skip=0&limit=100"
```
**Status:** 200 (OK) | 404 (not found)

---

### Update Status (UC4 - Ops)
```bash
curl -X PATCH http://localhost:8000/api/orders/42/status \
  -H "Content-Type: application/json" \
  -d '{"status": "confirmed"}'
```
**Valid statuses:** pending, confirmed, shipped, delivered
**Status:** 200 (OK) | 400 (bad request) | 404 (not found)

---

### Get Orders by Status (UC4 - Ops)
```bash
curl "http://localhost:8000/api/orders/status/pending?skip=0&limit=50"
```
**Status:** 200 (OK) | 400 (bad request)

---

## Setup (3 Steps)

### Step 1: Create Index
```sql
CREATE INDEX idx_products_id_stock ON products(id, stock);
```

### Step 2: Update main.py
```python
from api.orders import router as orders_router
app.include_router(orders_router, prefix="/api", tags=["Orders"])
```

### Step 3: Start Server
```bash
cd backend
python -m main
```

---

## Error Codes

| Code | Meaning | Common Cause |
|------|---------|-------------|
| 201 | Created | Order placed successfully |
| 200 | OK | Data retrieved/updated |
| 400 | Bad Request | Invalid customer_id, missing items, invalid status |
| 404 | Not Found | Product, customer, or order doesn't exist |
| 409 | Conflict | Out of stock (race condition safety) |
| 500 | Server Error | Database error (check logs) |

---

## Error Responses

### Out of Stock (409)
```json
{
  "detail": "Product 'Elite Shoes' only has 0 in stock, requested 1"
}
```

### Product Not Found (404)
```json
{
  "detail": "Product 999 not found"
}
```

### Invalid Status Transition (400)
```json
{
  "detail": "Cannot transition from 'pending' to 'shipped'. Allowed transitions from 'pending': ['confirmed']"
}
```

### Coupon Expired (400)
```json
{
  "detail": "Coupon 'OLDCODE' has expired"
}
```

---

## Order Response Schema

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
      "price": "100.00",
      "subtotal": "200.00",
      "created_at": "2025-07-23T10:30:00Z"
    }
  ],
  "subtotal": "200.00",
  "discount_amount": "40.00",
  "total": "160.00",
  "coupon_code": "SUMMER20",
  "created_at": "2025-07-23T10:30:00Z",
  "updated_at": "2025-07-23T10:30:00Z"
}
```

---

## Order Status Flow

```
pending
   ↓
confirmed
   ↓
shipped
   ↓
delivered (terminal)
```

**Valid transitions only. Backward transitions not allowed.**

---

## Coupon Types

### Percent Discount
```
discount_type: "percent"
value: 20
// Applied as: discount = subtotal * (20 / 100)
// Example: $100 subtotal → $20 discount → $80 total
```

### Fixed Discount
```
discount_type: "fixed"
value: 10
// Applied as: discount = $10
// Example: $100 subtotal → $10 discount → $90 total
```

---

## Race Condition Prevention

**Scenario:** 2 customers buy last unit

```
Request 1: BUY 1 unit (stock=1)
Request 2: BUY 1 unit (stock=1)

R1: FOR UPDATE (lock acquired) ✓
R2: FOR UPDATE (waiting)
R1: stock=1 >= 1 ✓ → UPDATE to 0 → COMMIT
R2: FOR UPDATE acquired
R2: stock=0 >= 1 ✗ → OutOfStockError

Result: Only R1 succeeds, R2 fails with 409
```

**Guarantee:** No overselling, no race conditions

---

## Service Methods

### OrderService API

```python
from services.order_service import OrderService

# Create order (atomic)
order = OrderService.create_order(
    db,
    customer_id=1,
    items=[{"product_id": 10, "quantity": 2}],
    coupon_code="SUMMER20"
)

# Get order
order = OrderService.get_order(db, order_id=42)

# Get customer orders
orders, total = OrderService.get_customer_orders(db, customer_id=1, skip=0, limit=100)

# Update status
order = OrderService.update_order_status(db, order_id=42, new_status="confirmed")

# Get orders by status
orders, total = OrderService.get_orders_by_status(db, status="pending", skip=0, limit=50)

# Get recent orders
orders = OrderService.get_recent_orders(db, limit=50)
```

---

## Exception Handling

```python
from shared.exceptions import (
    OutOfStockError,
    ProductNotFoundError,
    CustomerNotFoundError,
    InvalidOrderError,
    InvalidStatusTransitionError,
    CouponValidationError,
)

try:
    order = OrderService.create_order(db, customer_id, items)
except OutOfStockError as e:
    return {"error": str(e)}, 409
except CouponValidationError as e:
    return {"error": str(e)}, 400
except ProductNotFoundError as e:
    return {"error": str(e)}, 404
```

---

## Testing

```bash
# Run all tests
pytest backend/tests/test_order_service.py -v

# Run specific test
pytest backend/tests/test_order_service.py::test_create_order_success -v

# Run with coverage
pytest backend/tests/test_order_service.py --cov=services.order_service

# Run load test
ab -n 100 -c 100 -p payload.json http://localhost:8000/api/orders
```

---

## Database Schema (Key Columns)

### products
- `id` - Primary key
- `name` - Product name
- `price` - Unit price
- `stock` - Available quantity
- `low_stock_threshold` - Alert threshold

### orders
- `id` - Order ID
- `customer_id` - Customer who ordered
- `status` - pending|confirmed|shipped|delivered
- `subtotal` - Before discount
- `discount_amount` - Coupon discount
- `total` - After discount
- `coupon_code` - Applied coupon (nullable)

### order_items
- `id` - Line item ID
- `order_id` - Parent order
- `product_id` - Product ordered
- `quantity` - Units ordered
- `price` - Price at order time
- `subtotal` - quantity * price

### coupons
- `id` - Coupon ID
- `code` - Coupon code
- `discount_type` - percent|fixed
- `value` - Discount amount/percent
- `expires_at` - Expiration date
- `max_uses` - Maximum uses (NULL=unlimited)
- `used_count` - Current usage

---

## Performance Tips

### For Fast Orders
1. ✅ Use connection pooling (min=5, max=20)
2. ✅ Ensure index `idx_products_id_stock` exists
3. ✅ Keep transactions short (< 500ms)
4. ✅ Batch order creation when possible

### For High Concurrency
1. ✅ Multiple products → Parallel execution
2. ✅ Same product → Serialized by lock (fair queue)
3. ✅ No distributed locks needed (database handles it)
4. ✅ Horizontal scaling: one database, many app servers

---

## Monitoring

### Key Metrics
- Orders created per minute
- Out of stock errors (should be low)
- Average order creation time (< 100ms)
- Order status distribution
- Coupon usage rate
- Concurrent lock wait time

### Health Check
```bash
curl http://localhost:8000/health
```
Response: `{"status": "ok", "version": "1.0"}`

---

## Common Issues & Fixes

| Problem | Cause | Solution |
|---------|-------|----------|
| OutOfStockError frequently | High demand | Increase stock or add waitlist |
| Slow order creation | No index | Create `idx_products_id_stock` |
| Coupon not applying | Expired/limit exceeded | Verify coupon validity |
| Cannot update to shipped | Wrong current status | Status must be 'confirmed' first |
| 500 errors | Database connection | Check connection pool & database |

---

## Documentation Links

- **Setup:** [docs/getting-started/QUICKSTART.md](../getting-started/QUICKSTART.md) (5 minutes)
- **Integration:** See use-case guides in [docs/use-cases/](../use-cases/)
- **Technical:** [docs/architecture/services.md](../architecture/services.md) (deep dive)
- **Design:** [docs/design/](../design/) (concurrency, integration guides)
- **Tests:** `backend/tests/test_order_service.py` (examples)

---

## Support

For help:
1. Check this quick reference
2. Check Swagger UI at `http://localhost:8000/docs`
3. Check relevant documentation file
4. Review test examples
5. Check error message for details

---

## Summary

✅ 5 API endpoints
✅ Atomic order placement
✅ Race condition prevention
✅ Coupon integration
✅ Status tracking
✅ Comprehensive error handling
✅ Production-ready

**Ready to use!**
