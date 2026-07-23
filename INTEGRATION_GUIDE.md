# Integration Guide: 4 Use Cases → 1 System

This document explains how the 4 independently developed Use Cases integrate into a single working system.

## Overview: Dependency Graph

```
UC1 (Browse & Order)
    ├─→ UC2 (Promotions) [applies coupon at checkout]
    └─→ UC3 (Inventory) [decrements stock on order]

UC3 (Inventory)
    ├─→ UC4 (Tracking) [shown in ops dashboard]
    └─→ UC1 (Browse & Order) [visible stock on product page]

UC4 (Tracking)
    ├─→ UC1 (Browse & Order) [created when order placed]
    └─→ UC3 (Inventory) [ops manager views inventory + orders]
```

## Integration Points

### 1. UC1 + UC2: Coupon Application at Checkout

**Scenario:** Customer places order with coupon code

**Flow:**
1. UC1 receives `POST /orders { customer_id, items, coupon_code }`
2. UC1 calls UC2: `POST /coupons/validate { code }`
3. UC2 returns: `{ valid: true, discount_type: "percent", value: 10 }`
4. UC1 calculates discount: `discount = subtotal * (10 / 100)`
5. UC1 creates order with `discount_amount` and adjusted `total`
6. UC2 increments coupon `used_count`

**Files Affected:**
- `backend/uc1-browse-order/services/order_service.py` — calls UC2
- `backend/uc2-promotions/api/coupons.py` — validates coupon

**Test Case:** `tests/integration/test_uc2_coupon_at_checkout.py`

---

### 2. UC1 + UC3: Stock Decrement on Order

**Scenario:** Customer buys product, inventory is updated

**Flow:**
1. UC1 receives `POST /orders { items: [{ product_id: 1, qty: 2 }] }`
2. UC1 **atomically** updates: `UPDATE products SET stock = stock - 2 WHERE id = 1 AND stock >= 2`
3. If successful: order created, stock decremented
4. If stock < qty: returns 400 "Out of Stock"
5. UC3 dashboard immediately shows updated inventory

**Shared Resource:** `products.stock` column

**Critical Code:**
```python
# backend/uc1-browse-order/services/order_service.py
result = db.execute(
    update(Product)
    .where(Product.id == item.product_id)
    .where(Product.stock >= item.quantity)
    .values(stock=Product.stock - item.quantity)
)
if result.rowcount == 0:
    raise OutOfStockError(f"Product {item.product_id} unavailable")
```

**Race Condition Test:** `tests/integration/test_race_condition.py`
- Spawn 2 concurrent requests for last unit
- Verify only 1 succeeds, 1 gets 409 error

---

### 3. UC3 + UC4: Inventory Visible in Ops Dashboard

**Scenario:** Ops manager views orders and inventory on single dashboard

**Flow:**
1. UC4 provides `/orders` endpoint (list all orders with status)
2. UC3 provides `/inventory/low-stock` endpoint (list critical inventory)
3. Frontend combines both data in ops dashboard
4. Ops manager sees: "5 pending orders, 2 products at critical stock"

**Files Affected:**
- `frontend/src/pages/uc3-inventory/InventoryDashboard.jsx` — calls both UC3 + UC4 APIs
- `frontend/src/api/uc3-client.js` — `getInventory()`, `getLowStockAlerts()`
- `frontend/src/api/uc4-client.js` — `getOrders()`

---

### 4. UC1 + UC4: Order Created, Then Tracked

**Scenario:** Customer places order, immediately wants to track it

**Flow:**
1. UC1 `POST /orders` returns: `{ id: 123, status: "pending", ... }`
2. Customer receives order ID 123
3. Customer visits order tracking page
4. UC4 `GET /orders/123` shows: `{ id: 123, status: "pending", items: [...], total: 59.98 }`
5. Ops manager updates status: `PATCH /orders/123/status { status: "shipped" }`
6. Customer refreshes tracking page → sees updated status

**Shared Resource:** `orders` table

---

### 5. E2E Flow: Customer → Ops → Customer

**Complete Customer Journey:**

```
Customer → Browser
   ↓
UC1: GET /products → sees all products with stock
   ↓
Customer: Adds Widget A (qty: 2) to cart
   ↓
UC1: Cart stores items locally
   ↓
Customer: Enters coupon code SUMMER10
   ↓
UC2: POST /coupons/validate SUMMER10 → 10% discount
   ↓
Frontend: Shows "Subtotal: $59.98, Discount: -$6.00, Total: $53.98"
   ↓
Customer: Clicks "Place Order"
   ↓
UC1: POST /orders
   ├─ Check product exists
   ├─ Call UC2 validate coupon
   ├─ Calculate discount
   ├─ Atomically UPDATE products SET stock=stock-2 (race condition safe)
   ├─ Create order record
   └─ Return { id: 123, status: "pending", total: 53.98 }
   ↓
Frontend: Show "Order confirmed! Order ID: 123"
   ↓
[Ops Manager Dashboard Opens]
   ↓
UC3: GET /inventory/low-stock → shows Widget B at 3 units (critical)
   ↓
UC4: GET /orders (pending status) → shows new order 123 in queue
   ↓
Ops Manager: Clicks order 123 → sees items, customer email, total
   ↓
Ops Manager: Changes status "pending" → "shipped"
   ↓
UC4: PATCH /orders/123/status { status: "shipped" }
   ├─ Update order.status = "shipped"
   └─ Update order.updated_at
   ↓
[Customer Returns to Tracking Page]
   ↓
Frontend: POST order ID 123
   ↓
UC4: GET /orders/123
   ↓
Frontend: Display "Status: SHIPPED" (updated in real-time)
```

---

## Mock → Real Transition

### Phase 1: Independent Development (Mocks)

Each UC team starts with **hardcoded mock data**:

**UC1 Mock:**
```python
@router.get("/products")
async def list_products():
    return [
        {"id": 1, "name": "Widget A", "price": 29.99, "stock": 50},
        {"id": 2, "name": "Widget B", "price": 49.99, "stock": 5},
    ]
```

**UC2 Mock:**
```python
@router.post("/coupons/validate")
async def validate_coupon(code: str):
    if code == "SUMMER10":
        return {"valid": True, "discount_type": "percent", "value": 10}
    return {"valid": False}
```

**Benefit:** Frontend teams can develop UI without waiting for backend

### Phase 2: Database Integration (Still Independent)

Each UC team **connects to shared database**:

```python
# backend/uc1-browse-order/api/products.py
from sqlalchemy import Session
from backend.shared.models import Product
from backend.shared.db import get_db

@router.get("/products")
async def list_products(db: Session = Depends(get_db)):
    return db.query(Product).all()
```

Now all teams read/write **same database**. No mocks.

### Phase 3: Integration Testing

Run integration tests to verify cross-UC flows:

```bash
pytest tests/integration/test_uc1_end_to_end.py
pytest tests/integration/test_uc2_coupon_at_checkout.py
pytest tests/integration/test_uc3_inventory_visible.py
pytest tests/integration/test_uc4_order_tracking.py
pytest tests/integration/test_race_condition.py
```

### Phase 4: E2E Demo

Run full system:
```bash
# Terminal 1: Start FastAPI (all UC endpoints)
uvicorn backend.main:app --reload

# Terminal 2: Start React frontend
npm run dev

# Browser: http://localhost:5173
# API Docs: http://localhost:8000/docs
```

---

## Shared Resources: Rules

### Database Schema

**Read-Only (don't add tables):** `database/schema.sql`

**If you need a new table:**
1. Discuss with team lead
2. Add to schema.sql
3. Run migration: `psql < database/migrations/00X_new_table.sql`
4. All UC teams re-run schema

### ORM Models

**Read-Only (don't modify):** `backend/shared/models.py`

**If you need a new model:**
1. Add to `backend/shared/models.py`
2. Commit to repo
3. All UC teams pull and reload

### API Contracts

**Read-Only (don't change):** `api-contracts/openapi-spec.yaml`

**If endpoint spec needs to change:**
1. Discuss with architecture designer
2. Update spec in `api-contracts/openapi-spec.yaml`
3. Update implementation in all affected UC teams

---

## Troubleshooting: Common Integration Issues

### Issue: "Product stock doesn't decrement after order"

**Likely Cause:** UC1 not calling atomic UPDATE on products table

**Fix:** Verify `backend/uc1-browse-order/services/order_service.py` includes:
```python
db.execute(
    update(Product)
    .where(Product.id == item.product_id)
    .where(Product.stock >= item.quantity)
    .values(stock=Product.stock - item.quantity)
)
```

### Issue: "Coupon validation returns 400, but it should be valid"

**Likely Cause:** UC2 coupon not created in database, or expiry date passed

**Fix:**
```bash
# Check coupons in database
psql -d vibestrike -c "SELECT code, expires_at, used_count, max_uses FROM coupons;"

# If missing, add sample coupon
INSERT INTO coupons (code, discount_type, value, expires_at)
VALUES ('SUMMER10', 'percent', 10, '2026-12-31 23:59:59');
```

### Issue: "Two concurrent orders both succeed (race condition not prevented)"

**Likely Cause:** UC1 using wrong query (missing WHERE stock >= qty check)

**Fix:** Atomic query MUST include:
```sql
WHERE id = :product_id AND stock >= :qty
```

If rowcount == 0, return 400 "Out of Stock". Only if rowcount == 1 does order succeed.

---

## Testing Integration Points

See: `tests/integration/` for full test suite

**Key Tests:**
- `test_uc1_end_to_end.py` — Browse → add to cart → checkout
- `test_uc2_coupon_at_checkout.py` — Coupon validation + discount
- `test_uc3_inventory_visible.py` — Stock visible on products, inventory endpoint
- `test_uc4_order_tracking.py` — Order created → status tracked
- `test_race_condition.py` — 2 concurrent orders for last unit → only 1 succeeds

**Run all integration tests:**
```bash
pytest tests/integration/ -v
```

---

## Demo Checklist

- [ ] Customer browses products (stock visible)
- [ ] Add item to cart, see cart total
- [ ] Enter coupon code, see discount applied
- [ ] Place order → order ID returned
- [ ] Order appears in ops queue (UC4)
- [ ] Ops sees low-stock alerts (UC3)
- [ ] Ops updates order status to "shipped"
- [ ] Customer tracking page shows "shipped" status
- [ ] Two simultaneous orders for last unit → only 1 succeeds
- [ ] OpenAPI spec at `/docs` shows all endpoints
- [ ] No mid-demo bugs, smooth operation

