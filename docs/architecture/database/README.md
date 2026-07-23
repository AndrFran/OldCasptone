# Vibe Strike Database Layer

Complete database setup for the Order & Inventory Engine with atomic transactions, connection pooling, and comprehensive query helpers.

## Quick Start

### 1. Initialize Database

```bash
cd backend
python -c "from shared.migrations import init_schema; init_schema()"
```

### 2. Seed Test Data

```bash
python -c "from shared.migrations import reset_and_seed; reset_and_seed()"
```

### 3. Run Tests

```bash
python -m pytest shared/test_db.py -v
# OR
python shared/test_db.py
```

### 4. Start Application

```bash
python main.py
```

---

## Architecture

### Files Structure

```
backend/
├── config.py                  # Configuration (DATABASE_URL, etc.)
├── shared/
│   ├── db.py                 # Core DB module (engine, sessions, transactions)
│   ├── models.py             # SQLAlchemy ORM models (5 tables)
│   ├── queries.py            # Query helpers (ProductQueries, etc.)
│   ├── migrations.py         # Schema init & seed data
│   └── test_db.py            # Comprehensive test suite
└── main.py                   # FastAPI app entry point

database/
├── SCHEMA.md                 # Complete schema reference
└── README.md                 # This file
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **ORM** | SQLAlchemy | Database abstraction & relationships |
| **Database** | SQLite (dev) / PostgreSQL (prod) | Data persistence |
| **Isolation** | SERIALIZABLE | Race condition prevention |
| **Locking** | FOR UPDATE | Exclusive locks for stock checks |
| **Connection** | QueuePool | Connection pooling (10 connections) |

---

## Core Components

### 1. Database Engine (`shared/db.py`)

#### Connection Setup
```python
from shared.db import engine, SessionLocal, get_db

# SQLite auto-creates: vibestrike.db
# PostgreSQL requires existing database
```

#### FastAPI Dependency
```python
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from shared.db import get_db

@app.get("/products")
async def list_products(db: Session = Depends(get_db)):
    products = db.query(Product).all()
    return products
```

#### Atomic Transactions
```python
from shared.db import AtomicTransaction

with AtomicTransaction(session, isolation_level="SERIALIZABLE"):
    # All queries here are atomic
    product.stock -= quantity
    session.commit()  # All-or-nothing
```

#### Error Handling
```python
from shared.db import OutOfStockError, RecordNotFoundError

try:
    order = OrderQueries.create_order_atomic(session, ...)
except OutOfStockError as e:
    # e.product_id, e.requested, e.available
    return {"error": "Out of stock"}
except RecordNotFoundError as e:
    return {"error": "Product not found"}
```

### 2. Models (`shared/models.py`)

Five core tables with relationships and validation:

**Product**
```python
product = Product(
    name="Wireless Headphones",
    description="Noise-cancelling",
    price=Decimal("149.99"),
    stock=50,
    low_stock_threshold=10
)
session.add(product)
session.commit()

# Utility methods
assert product.is_low_stock()           # stock < threshold
assert product.can_fulfill(quantity)    # stock >= quantity
```

**Customer**
```python
customer = Customer(
    email="alice@example.com",
    name="Alice Johnson"
)
session.add(customer)
session.commit()
```

**Order**
```python
order = Order(
    customer_id=1,
    status="pending",           # pending → confirmed → shipped → delivered
    subtotal=Decimal("150.00"),
    discount_amount=Decimal("15.00"),
    total=Decimal("135.00"),
    coupon_code="WELCOME10"
)
session.add(order)
session.commit()

# Utility methods
order.calculate_total()
assert order.can_transition_to("confirmed")  # Validate status change
```

**OrderItem** (Line Item)
```python
item = OrderItem(
    order_id=1,
    product_id=5,
    quantity=2,
    price=Decimal("149.99"),      # Price snapshot
    subtotal=Decimal("299.98")
)
order.items.append(item)
```

**Coupon**
```python
coupon = Coupon(
    code="WELCOME10",
    discount_type="percent",       # or "fixed"
    value=Decimal("10"),
    expires_at=datetime.utcnow() + timedelta(days=30),
    max_uses=100,                  # None = unlimited
    used_count=0
)
session.add(coupon)
session.commit()

# Utility methods
assert coupon.is_valid()           # Not expired, within usage
coupon.is_expired()
coupon.is_exhausted()
coupon.get_remaining_uses()
```

### 3. Query Helpers (`shared/queries.py`)

Specialized query classes for each UC:

#### UC1: ProductQueries & OrderQueries
```python
from shared.queries import ProductQueries, OrderQueries

# Browse products
products, total = ProductQueries.list_products(session, skip=0, limit=100)
product = ProductQueries.get_product(session, product_id=5)

# Atomic order placement
order = OrderQueries.create_order_atomic(
    session,
    customer_id=1,
    items=[(product_id, quantity), ...],
    coupon_code="WELCOME10"
)

# Check stock
ProductQueries.check_stock(session, product_id=5, quantity=2)  # bool
ProductQueries.check_all_stock(session, items=[(1, 2), (3, 1)])  # bool

# Order tracking
order = OrderQueries.get_order(session, order_id=10)
orders, total = OrderQueries.get_customer_orders(session, customer_id=1)
OrderQueries.update_order_status(session, order_id=10, new_status="shipped")
```

#### UC2: CouponQueries
```python
from shared.queries import CouponQueries

# Validate coupon
coupon = CouponQueries.validate_coupon(session, code="WELCOME10")
if coupon:
    discount = CouponQueries.calculate_discount(coupon, Decimal("100.00"))
    # returns: Decimal("10.00") for 10% coupon

# Get active promotions
coupons, total = CouponQueries.get_active_promotions(session, skip=0, limit=100)
```

#### UC3: InventoryQueries
```python
from shared.queries import InventoryQueries

# Get inventory levels
inventory, total = InventoryQueries.get_all_inventory(session)
out_of_stock = InventoryQueries.get_out_of_stock(session)

# Get low-stock alerts
low_stock = InventoryQueries.get_low_stock_alerts(session)
for product in low_stock:
    urgency = InventoryQueries.get_urgency(product)  # "critical" or "warning"

# Restock
product = InventoryQueries.restock(session, product_id=5, quantity=50)
```

#### UC4: TrackingQueries
```python
from shared.queries import TrackingQueries

# Get order status
order = TrackingQueries.get_order_status(session, order_id=10)

# Get orders by status (ops dashboard)
pending, total = TrackingQueries.get_orders_by_status(session, "pending")
shipped, total = TrackingQueries.get_orders_by_status(session, "shipped")

# Ops queue
pending_list = TrackingQueries.get_pending_orders(session, limit=50)

# Date range
orders, total = TrackingQueries.get_orders_by_date_range(
    session,
    start_date=datetime(2025, 1, 1),
    end_date=datetime.utcnow()
)
```

#### Analytics
```python
from shared.queries import AnalyticsQueries

stats = AnalyticsQueries.get_order_stats(session)
# {
#     "total_orders": 45,
#     "total_revenue": 5234.67,
#     "by_status": {"pending": 5, "confirmed": 10, "shipped": 15, "delivered": 15}
# }

stats = AnalyticsQueries.get_inventory_stats(session)
# {
#     "total_products": 12,
#     "inventory_value": 15432.10,
#     "low_stock": 3,
#     "out_of_stock": 1
# }
```

### 4. Migrations (`shared/migrations.py`)

```python
from shared.migrations import init_schema, seed_products, reset_and_seed

# Initialize schema only
init_schema()

# Reset and seed all data
reset_and_seed()

# Verify schema
verify_schema()
```

---

## Race Condition Prevention

### Problem
Two concurrent requests for last unit in stock (stock=1)

### Solution
SERIALIZABLE isolation + FOR UPDATE locks

```
Client 1: POST /orders {items: [(product_id, 1)]}
Client 2: POST /orders {items: [(product_id, 1)]}

T1: BEGIN TRANSACTION (SERIALIZABLE)
T1: SELECT * FROM products WHERE id=X FOR UPDATE (exclusive lock)
T2: BEGIN TRANSACTION (SERIALIZABLE)
T2: SELECT * FROM products WHERE id=X FOR UPDATE (BLOCKS, waiting for T1's lock)

T1: CHECK stock >= 1 ✓
T1: UPDATE products SET stock = 0 WHERE id=X
T1: COMMIT (lock released)

T2: FOR UPDATE (lock acquired)
T2: CHECK stock >= 1 ✗ (stock is now 0)
T2: RAISE OutOfStockError
T2: ROLLBACK

Result:
✅ Order 1: Created (stock=0)
❌ Order 2: Failed with OutOfStockError
```

### Implementation
```python
with AtomicTransaction(session, isolation_level="SERIALIZABLE"):
    products = session.query(Product).filter(
        Product.id.in_(product_ids)
    ).with_for_update().all()  # Exclusive locks

    for product in products:
        if product.stock < requested_qty:
            raise OutOfStockError(...)
        product.stock -= requested_qty

    session.commit()  # All-or-nothing
```

---

## Configuration

### Environment Variables

```bash
# Database connection
DATABASE_URL=sqlite:///./vibestrike.db              # Dev (SQLite)
# DATABASE_URL=postgresql://user:pass@host:5432/db  # Prod (PostgreSQL)

# Database behavior
DB_ECHO=False              # Log all SQL statements
DB_POOL_SIZE=10            # Connection pool size
DB_POOL_RECYCLE=3600       # Recycle connections after 1 hour
DB_POOL_PRE_PING=True      # Verify connections before use

# API
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Claude AI
CLAUDE_API_KEY=sk-...
```

### Setting Up PostgreSQL (Production)

1. Create database
```sql
CREATE DATABASE vibestrike;
```

2. Update `.env`
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/vibestrike
```

3. Initialize
```bash
python -c "from shared.migrations import init_schema; init_schema()"
```

---

## Testing

### Run All Tests
```bash
python shared/test_db.py
```

### Expected Output
```
============================================================
VIBE STRIKE DATABASE TEST SUITE
============================================================
=== Testing Database Connection ===
✅ Database connection successful
=== Testing Schema Creation ===
✅ Schema created successfully
=== Testing Data Seeding ===
✅ Data seeding successful
=== Testing Basic CRUD ===
✅ CREATE: Product #1
✅ READ: Test Product (stock=10)
✅ UPDATE: Stock updated to 5
✅ DELETE: Product removed
...
============================================================
TEST SUMMARY
============================================================
✅ PASS: Connection
✅ PASS: Schema
✅ PASS: Seed Data
✅ PASS: CRUD Operations
✅ PASS: Atomic Transactions
✅ PASS: Query Helpers
✅ PASS: ORM Relationships
============================================================
Results: 7/7 tests passed
============================================================
```

---

## Common Patterns

### Pattern 1: List with Pagination
```python
items, total = ProductQueries.list_products(
    session, skip=0, limit=100
)
return {
    "items": items,
    "total": total,
    "skip": 0,
    "limit": 100
}
```

### Pattern 2: Get with Validation
```python
try:
    product = ProductQueries.get_product(session, product_id)
    if not product:
        raise RecordNotFoundError(f"Product {product_id} not found")
    return product
except RecordNotFoundError as e:
    return {"error": str(e)}, 404
```

### Pattern 3: Create with Atomicity
```python
try:
    with AtomicTransaction(session):
        order = OrderQueries.create_order_atomic(
            session, customer_id, items, coupon_code
        )
    return {"order_id": order.id, "total": order.total}, 201
except OutOfStockError as e:
    return {"error": "Out of stock", "available": e.available}, 400
except Exception as e:
    return {"error": str(e)}, 500
```

### Pattern 4: Update with Status Check
```python
try:
    order = OrderQueries.update_order_status(
        session, order_id, new_status
    )
    return order
except ValueError as e:
    return {"error": str(e)}, 400
except RecordNotFoundError as e:
    return {"error": str(e)}, 404
```

---

## Performance Optimization

### Indexes
All critical queries have indexes:
- `idx_products_stock`: Stock checks (FOR UPDATE)
- `idx_products_low_stock`: Inventory alerts
- `idx_orders_customer_id`: Customer history
- `idx_orders_status`: Ops dashboard
- `idx_coupons_code`: Coupon lookup
- More in `SCHEMA.md`

### Connection Pooling
- SQLite: StaticPool (in-memory, no overhead)
- PostgreSQL: QueuePool (10 connections, auto-recycle)

### Query Optimization
- Eager loading for relationships (`db.query().join()`)
- Filtered pagination to avoid loading all records
- Batch operations where possible

---

## Troubleshooting

### Issue: "Database is locked" (SQLite)
**Cause:** Multiple writers on SQLite
**Solution:** Use PostgreSQL for production, or reduce concurrency

### Issue: "Foreign key constraint failed"
**Cause:** Trying to delete product with existing orders
**Solution:** Use CASCADE delete or check for dependencies first

### Issue: "Out of stock" race condition
**Cause:** Missing SERIALIZABLE isolation or FOR UPDATE lock
**Solution:** Ensure using `AtomicTransaction` with `with_for_update()`

### Issue: Connection pool exhausted
**Cause:** Not closing sessions
**Solution:** Use `try/finally` to ensure session close, or FastAPI Depends

---

## References

- **Schema Details:** `database/SCHEMA.md`
- **Models:** `backend/shared/models.py`
- **Query Helpers:** `backend/shared/queries.py`
- **Database Module:** `backend/shared/db.py`
- **Tests:** `backend/shared/test_db.py`
- **Config:** `backend/config.py`
- **Main App:** `backend/main.py`

---

## Support

For issues or questions:
1. Check `database/SCHEMA.md` for schema details
2. Review `backend/shared/test_db.py` for examples
3. Run tests: `python shared/test_db.py`
4. Check logs for specific error messages
