# Parallel Development Strategy: 4 Use Cases, 4 Independent Teams

## Overview
Each use case developed independently with **shared API contracts** and **common database schema**. Teams can work in parallel without blocking each other.

## Project Structure for Parallel Work

```
capsotne/
├── api-contracts/              # Shared, READ-ONLY (defines boundaries)
│   ├── openapi-spec.yaml       # Complete API spec (teams read this)
│   ├── models/
│   │   ├── Product.schema.json
│   │   ├── Order.schema.json
│   │   ├── Coupon.schema.json
│   │   └── Inventory.schema.json
│   └── README.md               # "This is the contract, don't break it"
│
├── database/                   # Shared schema (all teams use this)
│   ├── schema.sql              # All tables: products, orders, coupons, inventory
│   ├── migrations/
│   │   ├── 001_init.sql
│   │   └── 002_add_indexes.sql
│   └── seed.sql                # Sample products, coupons
│
├── backend/
│   ├── uc1-browse-order/       # UC1: Browse products & place order
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── products.py     # GET /products, GET /products/:id
│   │   │   ├── orders.py       # POST /orders (atomic stock update)
│   │   │   └── models.py       # Pydantic schemas
│   │   ├── services/
│   │   │   └── order_service.py
│   │   ├── tests/
│   │   │   ├── test_products.py
│   │   │   └── test_order_placement.py
│   │   └── requirements.txt    # UC1-specific deps
│   │
│   ├── uc2-promotions/         # UC2: Discounts & coupons
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── coupons.py      # POST /coupons/validate, GET /promotions
│   │   │   └── models.py
│   │   ├── services/
│   │   │   └── promotion_service.py
│   │   ├── tests/
│   │   │   └── test_coupon_validation.py
│   │   └── requirements.txt
│   │
│   ├── uc3-inventory/          # UC3: Inventory levels & alerts
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── inventory.py    # GET /inventory, GET /inventory/low-stock, PATCH /inventory
│   │   │   └── models.py
│   │   ├── services/
│   │   │   └── inventory_service.py
│   │   ├── alerts/
│   │   │   └── low_stock_alerter.py
│   │   ├── tests/
│   │   │   └── test_inventory.py
│   │   └── requirements.txt
│   │
│   ├── uc4-order-tracking/     # UC4: Order status tracking
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── tracking.py     # GET /orders/:id, PATCH /orders/:id/status
│   │   │   └── models.py
│   │   ├── services/
│   │   │   └── tracking_service.py
│   │   ├── tests/
│   │   │   └── test_order_tracking.py
│   │   └── requirements.txt
│   │
│   ├── shared/                 # Shared utilities (all teams use)
│   │   ├── __init__.py
│   │   ├── db.py               # Database connection, session management
│   │   ├── models.py           # SQLAlchemy ORM models (shared)
│   │   └── exceptions.py       # Custom exceptions
│   │
│   ├── main.py                 # FastAPI app (imports from all UC modules)
│   ├── config.py               # Environment variables, DB connection string
│   └── requirements.txt        # All dependencies (union of UC requirements)
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── uc1-products/        # UC1 pages
│   │   │   │   ├── ProductListing.jsx
│   │   │   │   ├── ProductDetail.jsx
│   │   │   │   └── Cart.jsx
│   │   │   │
│   │   │   ├── uc1-checkout/        # UC1 continued
│   │   │   │   ├── Checkout.jsx
│   │   │   │   └── OrderConfirmation.jsx
│   │   │   │
│   │   │   ├── uc2-promotions/      # UC2 pages
│   │   │   │   ├── CouponInput.jsx
│   │   │   │   └── PromotionsList.jsx
│   │   │   │
│   │   │   ├── uc3-inventory/       # UC3 pages (ops)
│   │   │   │   ├── InventoryDashboard.jsx
│   │   │   │   ├── LowStockAlerts.jsx
│   │   │   │   └── RestockForm.jsx
│   │   │   │
│   │   │   └── uc4-tracking/        # UC4 pages
│   │   │       ├── OrderTracking.jsx
│   │   │       └── OrderHistory.jsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── uc1/
│   │   │   │   ├── useProducts.js
│   │   │   │   └── useCart.js
│   │   │   ├── uc2/
│   │   │   │   └── useCoupon.js
│   │   │   ├── uc3/
│   │   │   │   └── useInventory.js
│   │   │   └── uc4/
│   │   │       └── useOrderTracking.js
│   │   │
│   │   ├── api/
│   │   │   ├── uc1-client.js        # Calls UC1 endpoints
│   │   │   ├── uc2-client.js        # Calls UC2 endpoints
│   │   │   ├── uc3-client.js        # Calls UC3 endpoints
│   │   │   └── uc4-client.js        # Calls UC4 endpoints
│   │   │
│   │   ├── App.jsx
│   │   └── index.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
├── tests/
│   ├── integration/
│   │   ├── test_uc1_end_to_end.py       # E2E: browse → order
│   │   ├── test_uc2_coupon_at_checkout.py
│   │   ├── test_uc3_inventory_visible.py
│   │   ├── test_uc4_order_tracking.py
│   │   └── test_race_condition.py       # UC1 + UC3
│   └── concurrent/
│       └── test_concurrent_orders.py    # Stress test
│
├── docker-compose.yml          # Shared: FastAPI + PostgreSQL
├── .env.example
└── README.md
```

## How Parallel Teams Work

### Team 1: UC1 (Browse & Order)
**Owner:** Backend UC1 Engineer, Frontend UC1 Engineer

**Responsibilities:**
- `backend/uc1-browse-order/` — Product listing, order creation with atomic stock check
- `frontend/src/pages/uc1-*` — Product pages, cart, checkout UI
- **API Contract:** Uses `/products`, `/products/:id`, `POST /orders`
- **Dependencies:** Shared DB schema, shared models
- **Can work independently:** ✅ Yes (reads products, writes orders)

### Team 2: UC2 (Promotions)
**Owner:** Backend UC2 Engineer, Frontend UC2 Engineer

**Responsibilities:**
- `backend/uc2-promotions/` — Coupon validation, discount calculation
- `frontend/src/pages/uc2-promotions/` — Coupon input field, active promotions list
- **API Contract:** Uses `POST /coupons/validate`, `GET /promotions`
- **Dependencies:** Shared DB schema, shared models
- **Integrates with:** UC1 (coupon applied at checkout)
- **Can work independently:** ✅ Yes (until UC1 integration)

### Team 3: UC3 (Inventory Management)
**Owner:** Backend UC3 Engineer, Frontend UC3 Engineer

**Responsibilities:**
- `backend/uc3-inventory/` — Inventory levels, low-stock alerts, restock
- `frontend/src/pages/uc3-inventory/` — Inventory dashboard (ops), restock form
- **API Contract:** Uses `GET /inventory`, `GET /inventory/low-stock`, `PATCH /inventory`
- **Dependencies:** Shared DB schema, shared models
- **Integrates with:** UC1 (stock decrements on order)
- **Can work independently:** ✅ Yes (reads/writes inventory)

### Team 4: UC4 (Order Tracking)
**Owner:** Backend UC4 Engineer, Frontend UC4 Engineer

**Responsibilities:**
- `backend/uc4-order-tracking/` — Order status tracking, status updates
- `frontend/src/pages/uc4-tracking/` — Order tracking page, order history
- **API Contract:** Uses `GET /orders/:id`, `PATCH /orders/:id/status`
- **Dependencies:** Shared DB schema, shared models
- **Integrates with:** UC1 (order creation creates record), UC4 (status updates)
- **Can work independently:** ✅ Yes (reads/writes order status)

---

## Shared Contracts: API & Database

### API Contracts (Read-Only for Teams)

**File:** `api-contracts/openapi-spec.yaml`

```yaml
/products:
  get:
    tags: [UC1]
    responses:
      200:
        schema: { $ref: '#/components/schemas/ProductList' }

/products/{id}:
  get:
    tags: [UC1]
    responses:
      200:
        schema: { $ref: '#/components/schemas/Product' }

POST /orders:
  tags: [UC1]
  requestBody:
    schema: { $ref: '#/components/schemas/CreateOrderRequest' }
  responses:
    201:
      schema: { $ref: '#/components/schemas/Order' }
    400:
      description: "Out of Stock"
    409:
      description: "Race condition: stock unavailable"

POST /coupons/validate:
  tags: [UC2]
  requestBody:
    schema: { code: string }
  responses:
    200:
      schema: { $ref: '#/components/schemas/ValidCoupon' }
    400:
      description: "Invalid coupon"

GET /inventory:
  tags: [UC3]
  responses:
    200:
      schema: { $ref: '#/components/schemas/InventoryList' }

GET /inventory/low-stock:
  tags: [UC3]
  responses:
    200:
      schema: { $ref: '#/components/schemas/LowStockAlerts' }

PATCH /inventory/{productId}:
  tags: [UC3]
  responses:
    200:
      schema: { $ref: '#/components/schemas/Inventory' }

GET /orders/{id}:
  tags: [UC4]
  responses:
    200:
      schema: { $ref: '#/components/schemas/Order' }

PATCH /orders/{id}/status:
  tags: [UC4]
  requestBody:
    schema: { status: string }
  responses:
    200:
      schema: { $ref: '#/components/schemas/Order' }
```

### Database Schema (Shared)

**File:** `database/schema.sql`

```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  low_stock_threshold INT DEFAULT 10,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INT REFERENCES customers(id),
  status VARCHAR DEFAULT 'pending',  -- pending, confirmed, shipped, delivered
  total DECIMAL(10,2),
  coupon_code VARCHAR,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT REFERENCES orders(id),
  product_id INT REFERENCES products(id),
  quantity INT,
  price DECIMAL(10,2)
);

CREATE TABLE coupons (
  id SERIAL PRIMARY KEY,
  code VARCHAR UNIQUE NOT NULL,
  discount_type VARCHAR,  -- 'percent' or 'fixed'
  value DECIMAL(10,2),
  expires_at TIMESTAMP,
  max_uses INT,
  used_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for UC1 race condition: atomic stock check
CREATE INDEX idx_product_stock ON products(id, stock);

-- Index for UC4 tracking
CREATE INDEX idx_order_customer ON orders(customer_id);
CREATE INDEX idx_order_status ON orders(status);
```

---

## Mock/Stub Implementations

Each UC team starts with a **mock implementation** that returns hardcoded data, allowing frontend to develop in parallel.

### UC1 Mock (backend/uc1-browse-order/mock.py)
```python
# Team 1 frontend can develop against this while backend implements real DB
@router.get("/products")
async def list_products_mock():
    return [
        {"id": 1, "name": "Widget A", "price": 29.99, "stock": 5},
        {"id": 2, "name": "Widget B", "price": 49.99, "stock": 0},
    ]

@router.post("/orders")
async def create_order_mock(order: CreateOrderRequest):
    # Return success
    return {"id": 123, "status": "pending", "total": 79.98}
```

### UC2 Mock (backend/uc2-promotions/mock.py)
```python
@router.post("/coupons/validate")
async def validate_coupon_mock(code: str):
    if code == "SUMMER10":
        return {"valid": True, "discount_type": "percent", "value": 10}
    return {"valid": False, "error": "Invalid coupon"}
```

Similar for UC3, UC4.

---

## Integration Workflow (After Independent Development)

### Step 1: Point All Services to Shared Database
- All UC teams update their `.env` to use same `DATABASE_URL`
- Tables already exist (from `database/schema.sql`)

### Step 2: Replace Mocks with Real Implementations
- UC1: Real product query + atomic ORDER update
- UC2: Real coupon lookup
- UC3: Real inventory query
- UC4: Real order status query

### Step 3: Test Integration Points
```
UC1 + UC3: Order placement decrements inventory ✅
UC1 + UC2: Coupon applied at checkout ✅
UC1 + UC4: Order created, tracked via GET /orders/:id ✅
UC3: Low-stock alerts trigger ✅
Race condition: Two concurrent orders for last unit → only one succeeds ✅
```

---

## Development Checklist

| Team | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| **UC1** | Mock products + cart UI | Real DB + atomic order | E2E test browse→order |
| **UC2** | Mock coupon validation | Real coupon lookup | Integration with UC1 |
| **UC3** | Mock inventory list | Real inventory query + alerts | Low-stock alerts visible |
| **UC4** | Mock order tracking | Real status tracking | Status updates propagate |

---

## Key Rules for Parallel Work

1. **Don't modify API contracts** — Read `api-contracts/openapi-spec.yaml`, follow it
2. **Use shared database schema** — Don't add new tables without team consensus
3. **Use shared models** — All UC teams import from `backend/shared/models.py`
4. **Mock before real** — Start with mock implementations, teams can develop UI in parallel
5. **Integration tests** — `tests/integration/` verify cross-UC flows work
6. **Database isolation** — Use `docker-compose.yml` for local PostgreSQL; seeding is safe for all

