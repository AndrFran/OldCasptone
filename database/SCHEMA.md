# Vibe Strike Database Schema

Complete reference for the Vibe Strike Order & Inventory Engine database layer.

## Overview

**Database Type:** PostgreSQL (production) / SQLite (development)
**ORM:** SQLAlchemy
**Python Module:** `backend/shared/db.py`, `backend/shared/models.py`
**Isolation Level:** SERIALIZABLE (race condition prevention)

## Tables

### 1. `products` - Product Catalog

Master table for all available products.

```sql
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    low_stock_threshold INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_products_stock (id, stock),
    INDEX idx_products_low_stock (stock, low_stock_threshold)
);
```

**Key Fields:**
- `price`: Must be > 0 (enforced by CHECK constraint)
- `stock`: Current inventory count, must be >= 0
- `low_stock_threshold`: Alert threshold for inventory management
- `idx_products_stock`: For atomic FOR UPDATE locks during order placement
- `idx_products_low_stock`: For low-stock alert queries

**Usage:**
- UC1: Browse product catalog (GET /products)
- UC3: Monitor inventory levels
- UC4: Product details in order history

---

### 2. `customers` - Customer Accounts

Customer records with contact information.

```sql
CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_customers_email (email)
);
```

**Key Fields:**
- `email`: Unique identifier, used for login/lookup
- `name`: Customer display name

**Usage:**
- UC1: Order placement (customer reference)
- UC4: Order history queries (customer_id)

---

### 3. `orders` - Order Master Records

Central order record tracking status, totals, and discounts.

```sql
CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    subtotal DECIMAL(10,2) DEFAULT 0 CHECK (subtotal >= 0),
    discount_amount DECIMAL(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
    total DECIMAL(10,2) DEFAULT 0 CHECK (total >= 0),
    coupon_code VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_orders_customer_id (customer_id),
    INDEX idx_orders_status (status),
    INDEX idx_orders_created_at (created_at)
);
```

**Status Enum:** `pending` → `confirmed` → `shipped` → `delivered`

**Valid Transitions:**
- `pending` → `confirmed`, `cancelled`
- `confirmed` → `shipped`, `cancelled`
- `shipped` → `delivered`
- `delivered` → (terminal)

**Key Fields:**
- `status`: Order lifecycle stage
- `subtotal`: Sum of line item subtotals (before discount)
- `discount_amount`: Applied coupon discount
- `total`: subtotal - discount_amount
- `coupon_code`: Soft reference to coupons.code (nullable)

**Usage:**
- UC1: Order creation
- UC2: Discount application
- UC4: Order tracking and status updates

---

### 4. `order_items` - Line Items

Individual products within orders (price snapshot).

```sql
CREATE TABLE order_items (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_order_items_order_id (order_id),
    INDEX idx_order_items_product_id (product_id)
);
```

**Key Fields:**
- `quantity`: Units ordered
- `price`: Unit price at time of order (snapshot)
- `subtotal`: quantity × price

**Design Notes:**
- Price is snapshotted at order time (product.price may change later)
- Cascade delete on orders (order deletion removes line items)
- RESTRICT on products (cannot delete a product with existing line items)

**Usage:**
- UC1: Order placement (create line items)
- UC4: Order history display

---

### 5. `coupons` - Promotional Codes

Coupon/voucher management with discount tracking.

```sql
CREATE TABLE coupons (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
    value DECIMAL(10,2) NOT NULL CHECK (value > 0),
    expires_at TIMESTAMP NOT NULL,
    max_uses INTEGER NULL,
    used_count INTEGER DEFAULT 0 CHECK (used_count >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE INDEX idx_coupons_code (code),
    INDEX idx_coupons_expires_at (expires_at)
);
```

**Discount Types:**
- `percent`: Percentage off (e.g., value=10 → 10% off)
- `fixed`: Fixed amount off (e.g., value=5 → $5 off)

**Key Fields:**
- `code`: Unique coupon identifier (e.g., "WELCOME10")
- `discount_type`: How to apply discount
- `value`: Percentage or fixed amount
- `expires_at`: Expiration timestamp (validation: now < expires_at)
- `max_uses`: Usage limit (NULL = unlimited)
- `used_count`: Current usage counter

**Validation Logic:**
```python
is_valid() = (now < expires_at) AND (used_count < max_uses OR max_uses IS NULL)
```

**Usage:**
- UC2: Coupon validation (POST /coupons/validate)
- UC1: Discount application during checkout
- UC2: Active promotions list

---

## Relationships

```
customers (1) ──── (N) orders
                    ↓ ON DELETE CASCADE
                    (N) order_items
                    ↓
                    (N) products

coupons ←─ orders (soft FK via coupon_code)
```

## Key Constraints

### Foreign Key Cascades
- `customers` → `orders`: CASCADE (delete customer → delete orders)
- `orders` → `order_items`: CASCADE (delete order → delete line items)
- `products` → `order_items`: RESTRICT (cannot delete product with existing line items)
- `coupons` → `orders`: Soft reference (no enforced FK)

### Check Constraints
- `products.price > 0` ✓
- `products.stock >= 0` ✓
- `orders.subtotal >= 0` ✓
- `orders.discount_amount >= 0` ✓
- `orders.total >= 0` ✓
- `order_items.quantity > 0` ✓
- `order_items.price > 0` ✓
- `order_items.subtotal > 0` ✓
- `coupons.value > 0` ✓
- `coupons.discount_type IN ('percent', 'fixed')` ✓
- `coupons.used_count >= 0` ✓

### Unique Constraints
- `customers.email` UNIQUE
- `coupons.code` UNIQUE

### Indexes

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_products_stock` | products | (id, stock) | FOR UPDATE locks, stock check queries |
| `idx_products_low_stock` | products | (stock, low_stock_threshold) | Low-stock alert queries |
| `idx_customers_email` | customers | (email) | Customer lookup by email |
| `idx_orders_customer_id` | orders | (customer_id) | Customer order history |
| `idx_orders_status` | orders | (status) | Ops dashboard queries |
| `idx_orders_created_at` | orders | (created_at) | Date range queries |
| `idx_order_items_order_id` | order_items | (order_id) | Order detail retrieval |
| `idx_order_items_product_id` | order_items | (product_id) | Product sales analysis |
| `idx_coupons_code` | coupons | (code) | Coupon code lookup |
| `idx_coupons_expires_at` | coupons | (expires_at) | Active promotions list |

---

## Transaction Handling

### Atomic Order Placement (UC1)

Race condition scenario: Two concurrent requests for last unit in stock (stock=1)

```
Transaction Level: SERIALIZABLE
Lock Strategy: FOR UPDATE (exclusive locks)

T1:                          T2:
BEGIN                        BEGIN
SELECT ... FOR UPDATE        SELECT ... FOR UPDATE (blocks)
(lock acquired)
CHECK stock >= 1 ✓           
UPDATE stock = 0             
COMMIT                       
(lock released)              
                             FOR UPDATE (acquired)
                             CHECK stock >= 1 ✗
                             ROLLBACK (OutOfStockError)
```

**Result:** Only T1 succeeds; T2 fails with OutOfStockError. No overselling.

### Implementation Example

```python
from shared.db import AtomicTransaction
from shared.queries import OrderQueries

with AtomicTransaction(session, isolation_level="SERIALIZABLE"):
    order = OrderQueries.create_order_atomic(
        session,
        customer_id=1,
        items=[(product_id, quantity)],
        coupon_code="WELCOME10"
    )
```

---

## Query Patterns

### UC1: Browse Products & Place Order

```python
# List products
from shared.queries import ProductQueries
products, total = ProductQueries.list_products(session, skip=0, limit=100)

# Get single product
product = ProductQueries.get_product(session, product_id=5)

# Atomic order creation with stock check
order = OrderQueries.create_order_atomic(
    session,
    customer_id=1,
    items=[(1, 2), (3, 1)],  # [(product_id, qty), ...]
    coupon_code="WELCOME10"
)
```

### UC2: Coupon Validation & Discounts

```python
from shared.queries import CouponQueries

# Validate coupon
coupon = CouponQueries.validate_coupon(session, "WELCOME10")
if coupon:
    discount = CouponQueries.calculate_discount(coupon, Decimal("100.00"))
    # discount = Decimal("10.00")  # 10% of 100

# Get active promotions
coupons, total = CouponQueries.get_active_promotions(session)
```

### UC3: Inventory Management

```python
from shared.queries import InventoryQueries

# Get low-stock alerts
low_stock = InventoryQueries.get_low_stock_alerts(session)
for product in low_stock:
    urgency = InventoryQueries.get_urgency(product)
    # urgency: "critical" | "warning"

# Restock a product
product = InventoryQueries.restock(session, product_id=5, quantity=50)
```

### UC4: Order Tracking

```python
from shared.queries import TrackingQueries

# Get order with full details
order = TrackingQueries.get_order_status(session, order_id=10)

# Get pending orders (ops queue)
pending = TrackingQueries.get_pending_orders(session)

# Update order status
order = OrderQueries.update_order_status(session, order_id=10, new_status="shipped")
```

---

## Error Handling

### Custom Exceptions

```python
from shared.db import (
    OutOfStockError,           # Insufficient inventory
    RecordNotFoundError,       # Missing customer/product/order
    RaceConditionError,        # Concurrent modification
    DatabaseError              # Generic DB error
)

try:
    order = OrderQueries.create_order_atomic(session, ...)
except OutOfStockError as e:
    # Handle: e.product_id, e.requested, e.available
    return {"error": "Out of stock", "available": e.available}
except RecordNotFoundError as e:
    return {"error": str(e)}, 404
```

---

## Database Initialization

### Setup (First Time)

```bash
cd backend
python -c "from shared.migrations import init_schema; init_schema()"
```

### Seed Test Data

```bash
python -c "from shared.migrations import reset_and_seed; reset_and_seed()"
```

### Environment Configuration

```bash
# .env
DATABASE_URL=sqlite:///./vibestrike.db    # SQLite for dev
# DATABASE_URL=postgresql://user:pass@host:5432/vibestrike  # PostgreSQL for prod

DB_ECHO=False          # Log SQL statements
DB_POOL_SIZE=10        # Connection pool size
DB_POOL_RECYCLE=3600   # Recycle connections after 1 hour
DB_POOL_PRE_PING=True  # Verify connections before use
```

---

## Performance Notes

### Indexes
- **Stock check queries** use `idx_products_stock` (composite: id, stock)
- **Low-stock alerts** use `idx_products_low_stock` (stock, threshold)
- **Order lookups** use `idx_orders_customer_id` and `idx_orders_status`

### Connection Pooling
- SQLite: StaticPool (in-memory)
- PostgreSQL: QueuePool (10 connections, auto-recycle every 1 hour)

### Atomic Operations
- SERIALIZABLE isolation prevents race conditions
- FOR UPDATE locks prevent dirty reads
- All stock modifications are atomic

---

## Development vs. Production

| Aspect | Development | Production |
|--------|-------------|-----------|
| Database | SQLite | PostgreSQL |
| File | `vibestrike.db` | Remote DB |
| Pool Size | N/A (in-memory) | 10 connections |
| Echo SQL | Optional | False |
| Isolation | SERIALIZABLE | SERIALIZABLE |

---

## References

- Schema file: `backend/shared/models.py`
- Database module: `backend/shared/db.py`
- Query helpers: `backend/shared/queries.py`
- Migrations: `backend/shared/migrations.py`
- Config: `backend/config.py`
