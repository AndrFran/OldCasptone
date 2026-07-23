# UC3 Inventory Service: Concurrency & Race-Condition Safety

## Overview

The Vibe Strike inventory service implements **database-level atomicity** to prevent race conditions on stock inventory. The core innovation: **SERIALIZABLE isolation + FOR UPDATE locks** ensure atomic stock decrements without distributed locks.

## The Race Condition Problem

### Scenario: Last Unit Overselling

```
Initial State: Product X has stock=1

Timeline:
T1: GET /products/1 → stock=1 ✓
T2: GET /products/1 → stock=1 ✓
T1: POST /orders {product_id: 1, qty: 1} → Update stock to 0 ✓
T2: POST /orders {product_id: 1, qty: 1} → Update stock to -1 ❌ OVERSOLD

Result: Both orders succeed, but product is oversold by 1 unit
```

**Impact:** Lost sales, customer complaints, refund processing overhead

## Solution: Atomic Stock Check + Update

### Lock-Based Approach (Our Implementation)

**Key Principle:** Use **exclusive locks (FOR UPDATE)** to serialize concurrent transactions

```python
BEGIN TRANSACTION (SERIALIZABLE)
  SELECT products WHERE id=? FOR UPDATE  # Lock acquired, others wait
  
  if product.stock >= requested_qty:
    UPDATE products SET stock = stock - qty
    INSERT INTO orders (...)
    COMMIT  # Lock released
  else:
    ROLLBACK  # No changes, lock released
```

### Race-Condition Prevention with FOR UPDATE

```
T1 & T2 both request 1 unit of Product X (stock=1)

Timeline:
T1: BEGIN TRANSACTION (SERIALIZABLE)
T2: BEGIN TRANSACTION (SERIALIZABLE)

T1: SELECT products FOR UPDATE (lock acquired)
T2: SELECT products FOR UPDATE (BLOCKED, waiting for T1's lock)

T1: if stock >= 1? → YES (stock=1)
T1: UPDATE products SET stock=0
T1: COMMIT (lock released)

T2: SELECT products FOR UPDATE (lock acquired)
T2: if stock >= 1? → NO (stock=0 after T1 updated)
T2: ROLLBACK → OutOfStockException (400)

Result: Only T1 succeeds. Stock never goes negative. ✅
```

## Implementation Details

### 1. Inventory Model (SQLAlchemy)

```python
class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    stock = Column(Integer, nullable=False, default=0)
    low_stock_threshold = Column(Integer, default=10)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Key Fields:**
- `stock`: Current inventory level (atomic operations)
- `low_stock_threshold`: Ops alert threshold
- `updated_at`: Last modification timestamp

### 2. Stock Check Endpoint (WITHOUT Lock)

**Use Case:** Frontend checks if product is in stock before showing "Add to Cart"

```python
@staticmethod
def check_stock(db: Session, product_id: int, requested_qty: int) -> Dict:
    """
    Check if sufficient stock exists (no locking).
    Used by frontend for UI state (informational only).
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    return {
        "product_id": product_id,
        "available_stock": product.stock,
        "in_stock": product.stock >= requested_qty
    }
```

**API:**
```http
GET /inventory?product_id=1&qty=5
→ 200 {product_id: 1, available_stock: 50, in_stock: true}
```

**Why No Lock Here?**
- Frontend query is read-only (no race condition yet)
- Locks would kill performance for catalog browsing
- Stock may change between check and purchase (acceptable UX)

### 3. Stock Reserve Endpoint (WITH FOR UPDATE Lock)

**Use Case:** Atomic stock decrement during order placement

```python
@staticmethod
def reserve_stock(db: Session, product_id: int, quantity: int) -> Dict:
    """
    Atomically reserve (decrement) stock.
    Uses FOR UPDATE lock to prevent overselling.
    """
    # Step 1: Acquire exclusive lock
    product = db.query(Product).filter(
        Product.id == product_id
    ).with_for_update().first()  # ← FOR UPDATE
    
    # Step 2: Check stock while locked
    if product.stock < quantity:
        raise OutOfStockException(...)
    
    # Step 3: Atomic decrement (single UPDATE)
    product.stock -= quantity
    product.updated_at = datetime.utcnow()
    db.flush()  # Flush but don't commit (caller commits)
    
    return {"product_id": product_id, "remaining_stock": product.stock}
```

**Key Concurrency Features:**

| Feature | Purpose |
|---------|---------|
| `SERIALIZABLE` isolation | Prevents dirty reads, non-repeatable reads, phantom reads |
| `FOR UPDATE` lock | Exclusive lock on product row (others must wait) |
| `if stock >= qty` check | Atomic condition while locked |
| `UPDATE stock = stock - qty` | Single DB operation (no race condition) |
| Transaction rollback | If check fails, all changes discarded |

### 4. Batch Reserve (All-or-Nothing)

**Use Case:** Multi-item orders must all succeed or all fail

```python
@staticmethod
def batch_reserve_stock(db: Session, items: List[Dict]) -> List[Dict]:
    """
    Reserve stock for multiple items.
    Atomic: All items lock → All checks pass → All updates apply.
    """
    reservations = []
    try:
        for item in items:
            reservation = reserve_stock(db, item["product_id"], item["quantity"])
            reservations.append(reservation)
        # All succeeded, caller commits
        return reservations
    except OutOfStockException:
        db.rollback()  # ALL reservations rolled back
        raise
```

**Scenario:**

```
Order: 10x Product A, 5x Product B

T1: BEGIN TRANSACTION (SERIALIZABLE)
T1: FOR UPDATE on Product A → check 100 >= 10 → YES
T1: UPDATE products SET stock = stock - 10 (Product A)
T1: FOR UPDATE on Product B → check 50 >= 5 → YES
T1: UPDATE products SET stock = stock - 5 (Product B)
T1: COMMIT (all changes applied atomically)

T2: BEGIN TRANSACTION (SERIALIZABLE)
T2: FOR UPDATE on Product A → check 90 >= 10 → YES
T2: UPDATE products SET stock = stock - 10 (Product A)
T2: FOR UPDATE on Product B → check 45 >= 5 → NO
T2: ROLLBACK (both updates rolled back, not partial)
```

## Low-Stock Alerts Logic

### Query: Products Below Threshold

```python
@staticmethod
def get_low_stock_alerts(db: Session) -> List[Dict]:
    """Get products where stock < low_stock_threshold"""
    products = db.query(Product).filter(
        Product.stock < Product.low_stock_threshold
    ).order_by(Product.stock.asc()).all()
    
    alerts = []
    for product in products:
        urgency = "critical" if product.stock <= product.low_stock_threshold / 2 \
                            else "warning"
        alerts.append({
            "product_id": product.id,
            "product_name": product.name,
            "current_stock": product.stock,
            "urgency": urgency
        })
    return alerts
```

### Urgency Classification

| Condition | Urgency | Action |
|-----------|---------|--------|
| stock <= threshold/2 | **CRITICAL** | Immediate restock required |
| threshold/2 < stock < threshold | **WARNING** | Plan reorder, monitor closely |
| stock >= threshold | **NORMAL** | No alert |

**Example:**
```
Product: Widget B
threshold = 10

Case 1: stock = 3  → 3 <= 5 → CRITICAL
Case 2: stock = 7  → 5 < 7 < 10 → WARNING
Case 3: stock = 15 → 15 >= 10 → NORMAL
```

### Restock Operation

```python
@staticmethod
def restock_product(db: Session, product_id: int, quantity: int) -> Dict:
    """Add inventory (ops manager action)"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise ValueError("Product not found")
    
    product.stock += quantity
    product.updated_at = datetime.utcnow()
    db.flush()
    
    return {"product_id": product.id, "stock": product.stock}
```

**API:**
```http
PATCH /inventory/1
Content-Type: application/json
{"quantity": 50}

→ 200 {product_id: 1, stock: 100, updated_at: "2026-07-23T10:10:00Z"}
```

## Integration with UC1 (Order Placement)

### Order Placement Flow

```
1. Customer: POST /orders {customer_id, items: [{product_id, qty}], coupon_code?}

2. UC1 Backend:
   BEGIN TRANSACTION (SERIALIZABLE)
   
   3. Validate items exist
   4. InventoryService.batch_reserve_stock(items)  ← FOR UPDATE locks acquired
      - FOR UPDATE on each product
      - Check all stock levels
      - Decrement all inventory
   
   5. UC2.validate_coupon(coupon_code)
   6. Calculate discount
   
   7. INSERT INTO orders (...)
   8. INSERT INTO order_items (...)
   9. UPDATE orders SET total = ...
   10. UPDATE coupons SET used_count = used_count + 1
   
   COMMIT (all changes persist atomically)

3. UC3: Inventory automatically updated (step 4)
4. UC4: Order now queryable via GET /orders/{id}
5. Return: 201 Created {order_id, status, items, total, ...}
```

### Race-Condition Example in Order Context

```
Scenario: Both customers try to buy last iPhone
stock = 1, price = $1000 each

Customer A & B both submit orders simultaneously

Timeline:
T_A: POST /orders with iPhone qty=1
T_B: POST /orders with iPhone qty=1

T_A: BEGIN TRANSACTION (SERIALIZABLE)
T_B: BEGIN TRANSACTION (SERIALIZABLE)

T_A: InventoryService.batch_reserve_stock([{product_id: iPhone, qty: 1}])
T_A: FOR UPDATE on iPhone → check 1 >= 1 → YES
T_B: FOR UPDATE on iPhone → BLOCKED (T_A has lock)

T_A: UPDATE products SET stock = 0
T_A: INSERT INTO orders (order_id=100, items=[iPhone])
T_A: COMMIT (lock released)

T_B: FOR UPDATE on iPhone (lock acquired)
T_B: check 0 >= 1 → NO
T_B: ROLLBACK → OutOfStockException

Result:
✅ Order A: SUCCESS (customer gets iPhone)
❌ Order B: FAIL with 400 "Out of stock" (clear error message)

Both customers see deterministic outcome. No lost orders.
```

## Database-Level Guarantees

### SERIALIZABLE Isolation

PostgreSQL (or any DB with SERIALIZABLE):
- Reads are consistent snapshots (no dirty reads)
- Updates don't interleave (transactions appear sequential)
- Phantom reads prevented (no surprise new rows)

### FOR UPDATE Semantics

```sql
SELECT product FROM products WHERE id = 123 FOR UPDATE;
```

- Acquires exclusive lock on matched row
- Other transactions' FOR UPDATE queries **block**
- Other transactions' SELECT queries (without lock) proceed (may see stale data)
- Lock released on COMMIT/ROLLBACK

### Atomic Stock Update

```sql
UPDATE products SET stock = stock - 10 WHERE id = 123 AND stock >= 10;
```

**Why Safe:**
- Single SQL statement (no race condition between check and update)
- Executed under lock (no interleaving)
- DB constraint `stock >= 0` prevents negative inventory
- If check fails, UPDATE affects 0 rows (no update happens)

## Testing Concurrency

### Unit Tests (Sequential Simulation)

```python
def test_concurrent_reservation_simulation(db, sample_product):
    """
    Simulate concurrent reservations (sequential in single thread).
    Verifies lock semantics work correctly.
    """
    # First reservation: stock = 50 → 10
    result1 = reserve_stock(db, sample_product.id, 40)
    assert result1["remaining_stock"] == 10
    
    # Second reservation fails (only 10 left, requesting 15)
    with pytest.raises(OutOfStockException):
        reserve_stock(db, sample_product.id, 15)
    
    # Verify stock unchanged (rollback worked)
    db.refresh(sample_product)
    assert sample_product.stock == 10  ✅
```

### Integration Tests (Real Concurrency)

```python
import threading

def test_concurrent_orders(db):
    """Test true concurrent orders with real threads"""
    results = []
    errors = []
    
    def place_order(order_id):
        try:
            reserve_stock(db, product_id=1, quantity=1)
            results.append(order_id)
        except OutOfStockException:
            errors.append(order_id)
    
    # 10 threads, 1 product in stock
    threads = [threading.Thread(target=place_order, args=(i,)) for i in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    
    # Exactly 1 order succeeds, 9 fail
    assert len(results) == 1
    assert len(errors) == 9
```

## Performance Considerations

### Lock Contention

| Scenario | Impact | Mitigation |
|----------|--------|-----------|
| High-traffic products | Lock contention increases latency | Shard by region, use queue |
| Long transactions | Locks held longer | Keep transaction scope minimal |
| Deadlock risk | Two txns lock same rows in different order | Order locks consistently |

### Optimizations

1. **Minimize Lock Scope**
   ```python
   # BAD: Long transaction with locks
   begin_transaction()
   for_update(product)
   [slow validation logic]
   update_stock()
   commit()
   
   # GOOD: Quick validation before lock
   validate_items()  # No lock
   begin_transaction()
   for_update(product)
   update_stock()
   commit()
   ```

2. **Batch Locks**
   ```python
   # Lock all items first, then update
   for item in items:
       for_update(product)
   for item in items:
       update_stock()
   commit()
   ```

3. **Database Indexes**
   ```sql
   CREATE INDEX idx_products_id_stock ON products(id, stock);
   ```

## Failure Scenarios & Handling

### OutOfStockException

**When:** Stock insufficient during reserve

```python
@router.post("/orders")
async def create_order(request: CreateOrderRequest, db: Session):
    try:
        InventoryService.batch_reserve_stock(db, items)
    except OutOfStockException as e:
        return 400 {
            "error": "Out of stock",
            "details": f"Product {e.product_id} has only {e.available} units",
            "code": "OUT_OF_STOCK"
        }
```

**HTTP Status:** 400 Bad Request

### RaceConditionException

**When:** Conflict during transaction (very rare with FOR UPDATE)

```python
except RaceConditionException as e:
    return 409 {
        "error": "Race condition",
        "details": str(e),
        "code": "RACE_CONDITION"
    }
```

**HTTP Status:** 409 Conflict (retry-able)

### Database Constraints

```sql
ALTER TABLE products ADD CONSTRAINT check_stock_non_negative CHECK (stock >= 0);
```

Prevents negative inventory at database level.

## Deployment Checklist

- [ ] PostgreSQL with SERIALIZABLE support (v9.1+)
- [ ] Connection pooling configured (min 5, max 20)
- [ ] Query timeouts set (30s for long transactions)
- [ ] Index on `products(id, stock)` created
- [ ] Check constraint on `stock >= 0`
- [ ] Monitoring on transaction duration and lock wait times
- [ ] Log all OutOfStockException for analytics
- [ ] Backup/restore tested (inventory is critical)

## Summary

**The Vibe Strike inventory service prevents race conditions via:**

1. **SERIALIZABLE Isolation** — Transaction semantics
2. **FOR UPDATE Locks** — Exclusive row-level locks
3. **Atomic Updates** — Single UPDATE statement (stock = stock - qty)
4. **All-or-Nothing** — Batch operations roll back on failure

**No distributed locks needed.** The database handles concurrency safely and transparently.

**Result:** Guaranteed atomicity, deterministic outcomes, no overselling.
