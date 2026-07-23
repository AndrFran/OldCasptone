# Database Layer - Complete Index

## Quick Navigation

### 📖 Documentation
- **[DATABASE_IMPLEMENTATION.md](./DATABASE_IMPLEMENTATION.md)** - Complete overview of all deliverables
- **[DATABASE_SETUP_COMPLETE.md](./DATABASE_SETUP_COMPLETE.md)** - Setup checklist and summary
- **[database/SCHEMA.md](./database/SCHEMA.md)** - Complete schema reference (all tables, constraints, indexes)
- **[database/README.md](./database/README.md)** - Implementation guide with examples

### 💻 Source Code

#### Core Database Layer
- **[backend/shared/db.py](./backend/shared/db.py)** - Database engine, sessions, transactions, connection pooling
- **[backend/shared/models.py](./backend/shared/models.py)** - SQLAlchemy ORM models (5 tables)
- **[backend/shared/queries.py](./backend/shared/queries.py)** - Query helpers for all 4 UCs
- **[backend/shared/migrations.py](./backend/shared/migrations.py)** - Schema initialization & seed data
- **[backend/config.py](./backend/config.py)** - Database and FastAPI configuration

#### Testing & Verification
- **[backend/shared/test_db.py](./backend/shared/test_db.py)** - Comprehensive test suite (7 tests)

---

## What's Included

### ✅ 1. Database Connection & Management

**File:** `backend/shared/db.py`

- SQLAlchemy engine with auto-detection (SQLite/PostgreSQL)
- Connection pooling (QueuePool for PostgreSQL, StaticPool for SQLite)
- FastAPI dependency injection (`get_db()`)
- Atomic transaction management (SERIALIZABLE isolation)
- FOR UPDATE locks for race condition prevention
- Custom exception classes
- Database initialization and schema creation

**Key Exports:**
```python
engine                          # SQLAlchemy engine
SessionLocal                    # Session factory
get_db()                        # FastAPI dependency
AtomicTransaction               # Transaction context manager
DatabaseManager                 # CRUD helper class
OutOfStockError                 # Custom exception
```

### ✅ 2. Data Models

**File:** `backend/shared/models.py`

5 Core Tables:
1. **Product** - Product catalog with stock levels
2. **Customer** - Customer accounts
3. **Order** - Order master records
4. **OrderItem** - Line items (price snapshot)
5. **Coupon** - Promotional codes

**Features:**
- Check constraints (price > 0, stock >= 0, etc.)
- Foreign key relationships with CASCADE delete
- Proper indexes for query performance
- Utility methods for business logic
- Validation helpers

### ✅ 3. Query Helpers

**File:** `backend/shared/queries.py`

6 Query Classes:
- **ProductQueries** - Browse products, stock checks
- **OrderQueries** - Create orders (atomic), get orders, update status
- **CouponQueries** - Validate coupons, calculate discounts
- **InventoryQueries** - Get inventory, low-stock alerts, restock
- **TrackingQueries** - Order tracking, status filtering
- **AnalyticsQueries** - Revenue and inventory statistics

**Features:**
- Pagination support
- Atomic order creation with stock verification
- Race condition prevention (FOR UPDATE locks)
- Status transition validation
- Coupon expiry and usage limit checking

### ✅ 4. Schema Initialization

**File:** `backend/shared/migrations.py`

Functions:
- `init_schema()` - Create all tables
- `seed_products()` - 6 sample products
- `seed_customers()` - 4 sample customers
- `seed_coupons()` - 4 sample coupons
- `reset_and_seed()` - Full reset and seed
- `verify_schema()` - Verify all tables exist

### ✅ 5. Configuration

**File:** `backend/config.py`

Settings:
- DATABASE_URL (auto-detects SQLite vs PostgreSQL)
- Connection pool settings (size, recycle time, pre-ping)
- FastAPI configuration (title, version, CORS)
- Claude AI integration (API key, model)

### ✅ 6. Test Suite

**File:** `backend/shared/test_db.py`

7 Test Categories:
1. Database connection
2. Schema creation
3. Data seeding
4. CRUD operations
5. Atomic transactions with FOR UPDATE
6. Query helper functions
7. ORM relationships

---

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
python shared/test_db.py
```

### 4. Start Application
```bash
python main.py
```

### 5. Access API
```
http://localhost:8000        # API
http://localhost:8000/docs   # Auto-generated docs
http://localhost:8000/health # Health check
```

---

## Usage by Use Case

### UC1: Browse Products & Place Order

**Import:**
```python
from shared.queries import ProductQueries, OrderQueries
from shared.db import get_db, OutOfStockError
```

**Key Functions:**
```python
ProductQueries.list_products(session)           # GET /products
ProductQueries.get_product(session, product_id) # GET /products/{id}
OrderQueries.create_order_atomic(session, ...)  # POST /orders (ATOMIC!)
OrderQueries.get_customer_orders(session, ...)  # GET /customers/{id}/orders
```

### UC2: Promotions & Discounts

**Import:**
```python
from shared.queries import CouponQueries
```

**Key Functions:**
```python
CouponQueries.validate_coupon(session, code)           # POST /coupons/validate
CouponQueries.get_active_promotions(session)           # GET /promotions
CouponQueries.calculate_discount(coupon, subtotal)     # Discount calculation
```

### UC3: Inventory Management

**Import:**
```python
from shared.queries import InventoryQueries
```

**Key Functions:**
```python
InventoryQueries.get_all_inventory(session)        # GET /inventory
InventoryQueries.get_low_stock_alerts(session)     # GET /inventory/low-stock
InventoryQueries.restock(session, product_id, qty) # PATCH /inventory/{id}
InventoryQueries.get_urgency(product)              # Alert classification
```

### UC4: Order Status Tracking

**Import:**
```python
from shared.queries import TrackingQueries, OrderQueries
```

**Key Functions:**
```python
TrackingQueries.get_order_status(session, order_id)          # GET /orders/{id}
TrackingQueries.get_pending_orders(session)                  # Ops queue
OrderQueries.update_order_status(session, order_id, status)  # PATCH /orders/{id}/status
TrackingQueries.get_orders_by_status(session, status)        # Filter by status
```

---

## Architecture Overview

### Database Layer Stack
```
FastAPI Application
    ↓
get_db() dependency injection
    ↓
Session (SQLAlchemy)
    ↓
Query Helpers (queries.py)
    ↓
ORM Models (models.py)
    ↓
SQLAlchemy Engine
    ↓
Database (SQLite dev / PostgreSQL prod)
```

### Race Condition Prevention
```
Two concurrent requests → SERIALIZABLE isolation
                      → FOR UPDATE exclusive locks
                      → Atomic transactions
                      → All-or-nothing semantics
```

### Connection Flow
```
Application
    ↓
Connection Pool (10 connections)
    ↓
Database Connections
    ↓
Pre-ping verification (health check)
    ↓
Auto-recycle (3600s)
```

---

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=sqlite:///./vibestrike.db              # Dev
# DATABASE_URL=postgresql://user:pass@host:5432/db  # Prod

# Database behavior
DB_ECHO=False                  # SQL logging
DB_POOL_SIZE=10                # Pool size
DB_POOL_RECYCLE=3600           # Recycle interval (seconds)
DB_POOL_PRE_PING=True          # Connection health check

# FastAPI
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Claude AI
CLAUDE_API_KEY=sk-...
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

### .env Template
```
# Copy to .env and customize
DATABASE_URL=sqlite:///./vibestrike.db
DB_ECHO=False
DB_POOL_SIZE=10
DB_POOL_RECYCLE=3600
DB_POOL_PRE_PING=True
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
CLAUDE_API_KEY=your-key-here
```

---

## Error Handling

### Common Exceptions

```python
from shared.db import (
    OutOfStockError,        # Insufficient inventory
    RecordNotFoundError,    # Missing record
    RaceConditionError,     # Concurrent modification
    DatabaseError           # Generic DB error
)

try:
    order = OrderQueries.create_order_atomic(...)
except OutOfStockError as e:
    return {"error": "Out of stock", "available": e.available}
except RecordNotFoundError as e:
    return {"error": "Not found"}, 404
```

---

## Performance Notes

| Metric | Value | Notes |
|--------|-------|-------|
| Isolation Level | SERIALIZABLE | Race-free |
| Lock Type | FOR UPDATE | Exclusive |
| Connection Pool | 10 (PostgreSQL) | Configurable |
| Indexes | 10+ | All critical queries |
| Cascade Delete | Enabled | Referential integrity |
| Connection Recycle | 3600s | Prevents stale connections |
| Pre-ping | Enabled | Health verification |

---

## Development Workflow

### Initialize Project
```bash
cd backend
pip install -r requirements.txt
python -c "from shared.migrations import init_schema; init_schema()"
python -c "from shared.migrations import reset_and_seed; reset_and_seed()"
```

### Run Tests
```bash
python shared/test_db.py
```

### Start Development Server
```bash
python main.py
```

### Reset Database
```bash
python -c "from shared.migrations import reset_and_seed; reset_and_seed()"
```

### Enable SQL Logging
```bash
export DB_ECHO=True
python main.py
```

---

## File Structure

```
backend/
├── main.py                    # FastAPI application
├── config.py                  # Configuration
├── requirements.txt           # Dependencies
├── shared/
│   ├── __init__.py
│   ├── db.py                 # Core database layer
│   ├── models.py             # ORM models
│   ├── queries.py            # Query helpers
│   ├── migrations.py         # Schema & seeds
│   └── test_db.py            # Tests
├── uc1-browse-order/         # UC1 implementation
├── uc2-promotions/           # UC2 implementation
├── uc3-inventory/            # UC3 implementation
└── uc4-order-tracking/       # UC4 implementation

database/
├── SCHEMA.md                 # Schema reference
└── README.md                 # Usage guide

project_root/
├── DATABASE_INDEX.md         # This file
├── DATABASE_IMPLEMENTATION.md
└── DATABASE_SETUP_COMPLETE.md
```

---

## Testing Coverage

### Unit Tests
- ✅ Connection establishment
- ✅ Schema creation
- ✅ Data seeding
- ✅ CRUD operations
- ✅ Atomic transactions
- ✅ Query helpers
- ✅ ORM relationships

### Integration Tests
- ✅ FastAPI endpoints (via /docs)
- ✅ Database transactions
- ✅ Relationship cascades
- ✅ Constraint enforcement

---

## Next Steps for UC Teams

1. **Review Documentation**
   - Read `DATABASE_IMPLEMENTATION.md` for overview
   - Check `database/SCHEMA.md` for detailed schema

2. **Run Tests**
   - Execute `python shared/test_db.py`
   - Verify all 7 tests pass

3. **Implement UC Endpoints**
   - Use appropriate query helpers
   - Follow error handling patterns
   - Use FastAPI `Depends(get_db)` for database access

4. **Test Your Code**
   - Create integration tests
   - Use seed data for testing
   - Verify atomic operations

---

## Support & Troubleshooting

### Issue: Tests fail with import error
**Solution:** Ensure running from `backend` directory and `requirements.txt` installed

### Issue: Database locked (SQLite)
**Solution:** Close all connections or use PostgreSQL for production

### Issue: Connection pool exhausted
**Solution:** Ensure sessions are properly closed (use FastAPI Depends)

### Issue: Race conditions on stock
**Solution:** Ensure using `create_order_atomic()` with SERIALIZABLE isolation

### Enable Debug Logging
```python
# In config.py
DB_ECHO = True

# Or via environment
export DB_ECHO=True
```

---

## Related Documents

- **[DATABASE_IMPLEMENTATION.md](./DATABASE_IMPLEMENTATION.md)** - Complete feature list
- **[DATABASE_SETUP_COMPLETE.md](./DATABASE_SETUP_COMPLETE.md)** - Setup checklist
- **[database/SCHEMA.md](./database/SCHEMA.md)** - Schema details
- **[database/README.md](./database/README.md)** - Implementation guide

---

**Status:** ✅ COMPLETE & TESTED
**Ready for:** UC1-4 Implementation
**Date:** 2025-07-23

For questions or issues, refer to the comprehensive documentation files listed above.
