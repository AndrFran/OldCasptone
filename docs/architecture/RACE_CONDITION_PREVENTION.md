# Race Condition Prevention: Technical Implementation

## The Problem

**Scenario:** Two customers simultaneously buy the last unit of an exclusive product

```
Customer A                              Customer B
│                                       │
└─ Check stock: 1 unit ✓                │
│                                       └─ Check stock: 1 unit ✓
│
└─ Buy 1 unit (stock becomes 0)         │
                                        └─ Buy 1 unit (stock is 0, but already bought!)
                                        
Result: Overselling! 2 units sold but only 1 in stock!
```

This is a classic **race condition** - the check and update are not atomic.

---

## The Solution: Database-Level Atomicity

Order Service uses three database mechanisms to prevent this:

### 1. SERIALIZABLE Isolation Level

```sql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- All reads/writes in this transaction are isolated from other transactions
COMMIT;
```

**What it does:**
- Prevents dirty reads (reading uncommitted changes)
- Prevents non-repeatable reads (reading different values in same transaction)
- Prevents phantom reads (new rows appearing during transaction)
- Prevents write skew (concurrent updates conflicting)

**In Order Service:**
```python
db.begin(nested=False)  # Implicit SERIALIZABLE in SQLAlchemy with PostgreSQL
try:
    # All operations below are isolated
    order = OrderService.create_order(db, customer_id, items)
    db.commit()
except OutOfStockError:
    db.rollback()
```

### 2. FOR UPDATE Locks

```sql
SELECT * FROM products WHERE id = 10 FOR UPDATE;
```

**What it does:**
- Acquires exclusive (write) lock on the selected row
- Other transactions WAIT for the lock to be released
- Lock is held until transaction COMMIT or ROLLBACK

**In Order Service:**
```python
# Acquire exclusive lock on product
product = (
    db.query(Product)
    .with_for_update()  # Magic: acquires FOR UPDATE lock
    .filter(Product.id == product_id)
    .first()
)
# At this point, no other transaction can modify this product
# until we COMMIT or ROLLBACK
```

### 3. All-or-Nothing Check & Update

```python
# Check THEN update (both inside transaction with lock held)
if product.stock >= requested_qty:
    product.stock -= requested_qty  # UPDATE in same transaction
    order = Order(...)
    db.commit()  # All changes persist
else:
    db.rollback()  # No changes (stock unchanged)
```

---

## Walkthrough: Two Concurrent Orders on Last Unit

### Setup
```
Product: Elite Shoes (ID=10)
Initial Stock: 1 unit
Price: $100

Customer A (Request 1): Wants 1 unit
Customer B (Request 2): Wants 1 unit
```

### Execution Timeline

```
T0: Request A                          T0: Request B
    BEGIN TRANSACTION                      (waiting)

T1: SELECT FROM products               T1: (waiting for Request A)
    WHERE id=10 FOR UPDATE
    (LOCK ACQUIRED)

T2: Check: stock=1 >= qty=1 ✓          T2: (waiting for Request A's lock)

T3: UPDATE stock = 0                   T3: (waiting for Request A's lock)
    INSERT INTO orders
    INSERT INTO order_items

T4: COMMIT                             T4: BEGIN TRANSACTION
    (LOCK RELEASED)

T5:                                    T5: SELECT FROM products
                                           WHERE id=10 FOR UPDATE
                                           (NOW can acquire lock)

T6:                                    T6: Check: stock=0 >= qty=1 ✗
                                           
T7:                                    T7: OutOfStockError → ROLLBACK

Result: ✅ Request A: SUCCESS (1 unit sold)
        ✅ Request B: FAILED (409 Conflict - Out of Stock)
        ✅ NO OVERSELLING!
```

### Key Points

1. **Lock Acquired (T1):** Request A gets exclusive lock on product row
2. **Request B Blocks (T1-T3):** Request B waits for lock (doesn't proceed)
3. **Stock Decremented (T3):** Request A atomically updates stock to 0
4. **Lock Released (T4):** Request A commits, lock released
5. **Check Fails (T6):** Request B acquires lock, checks stock (now 0), fails
6. **Rollback (T7):** Request B rolls back with OutOfStockError

---

## Why This Works (And Why Others Don't)

### ❌ Without Locks

```python
# WRONG - Race condition vulnerability
product = db.query(Product).filter_by(id=10).first()
if product.stock >= 1:  # Check at T1
    product.stock -= 1  # Update at T2 (but Request B also updated between T1-T2!)
    db.commit()
```

**Problem:** Between check (T1) and update (T2), another request can modify stock!

### ❌ With Only SERIALIZABLE (No FOR UPDATE)

```python
# SOMEWHAT BETTER but can still conflict
db.execute(text("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE"))
db.begin()
product = db.query(Product).filter_by(id=10).first()
if product.stock >= 1:
    product.stock -= 1
    db.commit()  # SERIALIZATION_FAILURE possible if concurrent update
```

**Problem:** Two requests might both pass the check before either commits, causing one to fail with SERIALIZATION_FAILURE (retry logic needed).

### ✅ With FOR UPDATE (The Right Way)

```python
# CORRECT - No race conditions
product = db.query(Product).with_for_update().filter_by(id=10).first()
# Lock acquired here - no other transaction can modify this row
if product.stock >= 1:
    product.stock -= 1
    db.commit()  # Lock released
# If another transaction waits here, it gets fresh stock value
```

**Why it works:** Lock ensures only one transaction modifies stock at a time.

---

## Implementation in Order Service

### Full Atomic Order Placement Flow

```python
def create_order(db, customer_id, items, coupon_code=None):
    # 1. BEGIN TRANSACTION (implicit with SQLAlchemy)
    
    # 2. Verify customer exists
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise CustomerNotFoundError(...)
    
    # 3. SELECT all products FOR UPDATE (acquire exclusive locks)
    products_dict = {}
    for item in items:
        product = (
            db.query(Product)
            .with_for_update()  # ← CRITICAL: Acquires lock
            .filter(Product.id == item['product_id'])
            .first()
        )
        if not product:
            raise ProductNotFoundError(...)
        products_dict[item['product_id']] = product
    
    # At this point, we hold exclusive locks on all products
    # No other transaction can modify these rows until we commit
    
    # 4. Validate stock for ALL items (all-or-nothing check)
    for item in items:
        product = products_dict[item['product_id']]
        if product.stock < item['quantity']:
            raise OutOfStockError(...)  # Will trigger ROLLBACK
    
    # 5. Atomically UPDATE products (decrement stock)
    for product_id, product in products_dict.items():
        qty_ordered = next(i['quantity'] for i in items if i['product_id'] == product_id)
        product.stock -= qty_ordered  # UPDATE in transaction
        product.updated_at = datetime.utcnow()
    
    # 6. INSERT order & order_items
    order = Order(customer_id=customer_id, ...)
    db.add(order)
    db.flush()  # Get order.id
    
    for item in items:
        product = products_dict[item['product_id']]
        order_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=item['quantity'],
            price=product.price,
            subtotal=product.price * item['quantity']
        )
        db.add(order_item)
    
    # 7. Apply coupon (if provided)
    if coupon_code:
        discount = _apply_coupon(db, order, coupon_code, order.subtotal)
        order.discount_amount = discount
    
    # 8. Calculate total
    order.total = order.subtotal - order.discount_amount
    
    # 9. COMMIT (all changes persist atomically, locks released)
    db.commit()
    return order
    
    # If any exception occurs above, implicit ROLLBACK happens:
    # - Stock reverts to original value
    # - No order/order_items created
    # - Coupon usage not incremented
    # - Exception propagates to caller
```

---

## Concurrency Analysis

### Scenario: Multiple Orders on Same Product

```
Product A (ID=1): stock=10
Request 1: Buy 5 units → Succeeds
Request 2: Buy 3 units → Succeeds
Request 3: Buy 4 units → Succeeds
Request 4: Buy 3 units → Fails (OutOfStockError)
```

**Timeline:**
```
R1 ──→ FOR UPDATE acquired
R2 ──→ (waiting for R1's lock)
R3 ──→ (waiting for R1's lock)
R4 ──→ (waiting for R1's lock)

R1: Check 10 >= 5 ✓
R1: stock = 10 - 5 = 5
R1: COMMIT (lock released)

R2: FOR UPDATE acquired
R2: Check 5 >= 3 ✓
R2: stock = 5 - 3 = 2
R2: COMMIT (lock released)

R3: FOR UPDATE acquired
R3: Check 2 >= 4 ✗
R3: OutOfStockError → ROLLBACK (lock released)

R4: FOR UPDATE acquired
R4: Check 2 >= 3 ✗
R4: OutOfStockError → ROLLBACK
```

**Key Property:** Transactions are serialized by lock (FIFO queue), ensuring stock is always accurate.

### Scenario: Multiple Orders on Different Products

```
Product A (ID=1): stock=10
Product B (ID=2): stock=10

Request 1: Buy 5 units of A, 3 units of B
Request 2: Buy 3 units of A, 4 units of B
```

**Timeline:**
```
R1: FOR UPDATE A (acquired), FOR UPDATE B (acquired)
R2: FOR UPDATE A (waiting for R1), FOR UPDATE B (waiting for R1)

R1: Check A: 10 >= 5 ✓, B: 10 >= 3 ✓
R1: Update A: 10 - 5 = 5, B: 10 - 3 = 7
R1: COMMIT (all locks released)

R2: FOR UPDATE A (acquired), FOR UPDATE B (acquired)
R2: Check A: 5 >= 3 ✓, B: 7 >= 4 ✓
R2: Update A: 5 - 3 = 2, B: 7 - 4 = 3
R2: COMMIT
```

**Result:** Both succeed because they're working on different products.

---

## Database-Level Guarantees

### ACID Properties

Order Service exploits PostgreSQL's ACID guarantees:

**A - Atomicity:** All-or-nothing
```
BEGIN;
    UPDATE products SET stock = 0;
    INSERT INTO orders ...;
COMMIT;
// Either both succeed or both fail, no partial state
```

**C - Consistency:** Data integrity
```
// CHECK constraint on products.stock >= 0 prevents negative inventory
// FOREIGN KEY constraints prevent orphaned orders
```

**I - Isolation:** Transactions don't interfere
```
// SERIALIZABLE isolation prevents one transaction's changes
// from being visible to another until COMMIT
```

**D - Durability:** Changes persist
```
// Once COMMIT completes, changes are written to disk
// Guaranteed to survive system failures
```

---

## Index Optimization

```sql
CREATE INDEX idx_products_id_stock ON products(id, stock);
```

**Why this index is critical:**

1. **FOR UPDATE Lock Efficiency**
   - Enables fast row lookup (id)
   - Enables fast stock comparison (stock in WHERE clause)

2. **O(log n) Lookup**
   - Instead of table scan (O(n))
   - Scales with millions of products

3. **Query Optimization**
   - PostgreSQL uses index to find product row quickly
   - Acquires lock on correct row immediately
   - Minimizes lock hold time

**Without this index:**
- Table scan required for each FOR UPDATE query
- Lock held longer (more contention)
- Performance degrades with product catalog size

---

## Connection Pooling Impact

```
Connection Pool (min=5, max=20)

5 concurrent requests:
  ┌─ Connection 1 (R1) → Product A FOR UPDATE
  ├─ Connection 2 (R2) → Product A FOR UPDATE (waiting)
  ├─ Connection 3 (R3) → Product B FOR UPDATE (succeeds in parallel)
  ├─ Connection 4 (R4) → Product A FOR UPDATE (waiting)
  └─ Connection 5 (R5) → Product C FOR UPDATE (succeeds in parallel)

Result: Requests on different products proceed in parallel
        Requests on same product serialize (lock queue)
```

**Key Benefit:** High throughput for mixed workloads (many products).

---

## Testing Race Conditions

### Unit Test: Race Condition Prevention

```python
def test_concurrent_orders_same_product(db: Session, customer, product_limited):
    """
    Simulate race condition:
    - Two concurrent orders on product with 1 unit
    - One succeeds, one fails with OutOfStockError
    """
    items = [{'product_id': product_limited.id, 'quantity': 1}]
    
    # First order succeeds
    order1 = OrderService.create_order(db, customer.id, items)
    assert order1.id is not None
    
    # Stock now 0
    db.refresh(product_limited)
    assert product_limited.stock == 0
    
    # Second order fails
    with pytest.raises(OutOfStockError):
        OrderService.create_order(db, customer.id, items)
```

### Load Test: High Concurrency

```bash
# Simulate 100 concurrent requests for last unit
ab -n 100 -c 100 \
  -p order_payload.json \
  http://localhost:8000/api/orders

# Expected results:
# - 1 succeeds (201 Created)
# - 99 fail (409 Conflict - OutOfStockError)
# - Response times: 50-200ms (serialized by lock)
# - NO crashes, NO overselling
```

---

## Comparison with Alternatives

| Approach | Mechanism | Guarantees | Complexity | Scalability |
|----------|-----------|-----------|-----------|------------|
| **FOR UPDATE (This) ✅** | Database locks | Perfect | Low | Excellent |
| **Distributed Lock (Redis)** | External service | Good (TTL issues) | High | Good |
| **Optimistic Locking (Version)** | Version fields | Good (conflicts) | Medium | Excellent |
| **Message Queue** | Async processing | Good (delays) | High | Excellent |
| **No Locking ❌** | None | Poor (oversell) | None | Bad |

**For Order Service:** FOR UPDATE is the clear winner:
- Perfect atomicity (database guarantees)
- Simple to understand & maintain
- No external dependencies
- Scales horizontally (one database, many app servers)

---

## Future Enhancements

1. **Idempotency:** Add `X-Idempotency-Key` header for retry safety
   ```python
   # Same key + same request = same order ID returned
   # Prevents double-charging on retries
   ```

2. **Reservation System:** Reserve stock for 10 minutes after order
   ```python
   # "Reserved" state prevents overselling to other customers
   # Expires if payment not completed
   ```

3. **Partial Orders:** Allow backorder queue for out-of-stock items
   ```python
   # Split order: 5 in-stock + 3 backordered
   # Separate fulfillment workflows
   ```

4. **Deadlock Detection:** Automatic retry on deadlock
   ```python
   # Rare case: circular lock dependencies
   # Detect & retry with exponential backoff
   ```

---

## Monitoring & Observability

### Metrics to Track

```python
# Lock contention
orders_created_per_minute = Counter()
out_of_stock_errors = Counter()
avg_order_creation_time = Histogram()

# Product popularity
orders_per_product = Histogram()
stock_depletion_rate = Gauge()

# Performance
lock_wait_time = Histogram()
transaction_duration = Histogram()
```

### Alerts

```
⚠️ High OutOfStockError rate → Increase stock
⚠️ Slow order creation (>500ms) → Check lock contention
⚠️ Lock timeouts → Investigate deadlocks
⚠️ Stock negative (database constraint) → Data integrity issue
```

---

## Summary

The Order Service prevents race conditions using **three database mechanisms:**

1. **SERIALIZABLE Isolation** - Transactions isolated from each other
2. **FOR UPDATE Locks** - Exclusive locks on products being modified
3. **Atomic Transactions** - All-or-nothing (ACID guarantees)

**Result:** Perfect race condition prevention with simple, maintainable code.

**No distributed locks, no complex retry logic, no false positives.**

Just database transactions doing what they're built for! 🚀
