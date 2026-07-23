# UC4 Implementation Analysis: Order Status Tracking

**Date:** 2026-07-23  
**Branch:** `feature/use_case_4`  
**Scope:** Order status tracking for ops managers + customer tracking page  
**Objective:** Minimize interference with UC1–3 (being developed by other teams in parallel)

---

## Executive Summary

This document provides a **read-only analysis** of the current project state and a clear **implementation strategy** for UC4. The strategy prioritizes:

1. **Non-invasive design** — Use existing endpoints/models; add new UC4-specific endpoints only
2. **Clear dependency management** — Identify what UC4 depends on vs. what can be implemented now
3. **Integration readiness** — Design for seamless integration with UC1–3 without requiring them to change their code
4. **Parallel development** — UC4 can proceed independently while UC1–3 implement their features

---

## Current State Analysis

### Architecture Overview

**Stack:** FastAPI (Python) + PostgreSQL + React (Vite) + Tailwind + shadcn/ui

**Directory Structure:**
```
backend/
├── main.py                  # FastAPI app (imports all UC routers)
├── config.py               # Environment config
├── shared/                 # Shared by all UCs
│   ├── db.py              # Database session management
│   ├── models.py          # SQLAlchemy ORM (Product, Customer, Order, OrderItem, Coupon)
│   ├── schemas.py         # Pydantic request/response models
│   ├── exceptions.py      # Custom exceptions
│   └── queries.py         # Shared database queries
├── api/                    # Existing endpoints (UC1 mostly)
│   ├── products.py        # GET /products, GET /products/:id
│   └── orders.py          # POST /orders (UC1), GET /orders/:id (UC4 stub), PATCH /orders/:id/status (UC4 stub)
├── services/
│   ├── order_service.py   # OrderService (atomic order creation, status tracking)
│   └── ...
├── uc2_promotions/        # UC2: Coupon validation
│   ├── api/coupons.py     # POST /coupons/validate, GET /promotions
│   ├── services/
│   └── schemas.py
├── uc3-inventory/         # UC3: Inventory management
│   ├── api/inventory.py   # GET /inventory, GET /inventory/low-stock, PATCH /inventory/:id
│   ├── services/
│   └── ...
└── uc4-order-tracking/    # UC4 (to be implemented)
    ├── README.md          # Specification
    └── (empty)

frontend/src/
├── App.jsx               # Main routing
├── pages/
│   ├── ProductList.jsx         # UC1: Browse products
│   ├── ProductDetail.jsx       # UC1: Product details
│   ├── Cart.jsx                # UC1: Shopping cart
│   ├── Checkout.jsx            # UC1 + UC2: Apply coupon + place order
│   ├── OrderConfirmation.jsx   # UC1: Order created confirmation
│   ├── OrderTracking.jsx       # UC4: Track order status
│   ├── InventoryPage.jsx       # UC3: Ops inventory dashboard
│   └── OrdersPage.jsx          # (Unclear, needs review)
├── components/
│   ├── OrderQueue.jsx          # Order list (for ops)
│   ├── OrderDetail.jsx         # Order detail view
│   ├── OrderStatusFilter.jsx   # Filter orders by status
│   ├── LowStockAlerts.jsx      # UC3: Low-stock alerts
│   ├── ...
└── api/
    └── (API client calls)
```

### Shared Database Schema

**Key Tables:**
- `products` — id, name, price, stock, low_stock_threshold, created_at, updated_at
- `customers` — id, email, name, created_at
- **`orders`** — id, customer_id, status (pending|confirmed|shipped|delivered), subtotal, discount_amount, total, coupon_code, created_at, updated_at
- **`order_items`** — id, order_id, product_id, quantity, price, subtotal, created_at
- `coupons` — id, code, discount_type, value, expires_at, max_uses, used_count, created_at

**Indexes:**
- `idx_orders_customer_id` — For customer order history lookups
- `idx_orders_status` — For filtering orders by status (ops queue)
- `idx_order_items_order_id` — For fetching order items

### Shared ORM Models (backend/shared/models.py)

All teams import these models:

```python
class Order(Base):
    __tablename__ = "orders"
    id, customer_id, status, subtotal, discount_amount, total, coupon_code, created_at, updated_at
    
    # Status enum: "pending", "confirmed", "shipped", "delivered"
    # Methods: calculate_total(), get_valid_statuses(), can_transition_to(new_status)

class OrderItem(Base):
    __tablename__ = "order_items"
    id, order_id, product_id, quantity, price, subtotal, created_at

class Customer(Base):
    __tablename__ = "customers"
    id, email, name, created_at

class Product(Base):
    __tablename__ = "products"
    id, name, description, price, stock, low_stock_threshold, created_at, updated_at
```

### API Contracts (api-contracts/openapi-spec.yaml)

**UC4-specific endpoints (read-only):**

```yaml
GET /orders/{order_id}
  → 200: Order details (id, customer_id, status, items[], subtotal, discount, total, created_at)
  → 404: Order not found

PATCH /orders/{order_id}/status
  → Request: { status: "pending" | "confirmed" | "shipped" | "delivered" }
  → 200: Updated order
  → 400: Invalid status transition
  → 404: Order not found

GET /customers/{customer_id}/orders
  → 200: List of orders for customer
  → 404: Customer not found
```

### Existing Backend Endpoints

**UC1 (already implemented):**
- `GET /products` — List all products
- `GET /products/{id}` — Get product details
- `POST /orders` — Create order (atomic with race condition prevention)

**UC2 (already implemented):**
- `POST /coupons/validate` — Validate coupon code
- `GET /promotions` — List active promotions

**UC3 (already implemented):**
- `GET /inventory` — All inventory levels
- `GET /inventory/low-stock` — Low-stock alerts
- `PATCH /inventory/{product_id}` — Restock product

**UC4 (partially stubbed):**
- `backend/api/orders.py` has stubs for `GET /orders/{order_id}`, `PATCH /orders/{order_id}/status`, `GET /customers/{customer_id}/orders`
- `services/order_service.py` has some supporting logic

### Existing Frontend Pages

- **ProductList.jsx** — UC1: Browse products with filters
- **ProductDetail.jsx** — UC1: Single product page
- **Cart.jsx** — UC1: Shopping cart management
- **Checkout.jsx** — UC1 + UC2: Cart review + coupon input + place order
- **OrderConfirmation.jsx** — UC1: Confirmation after order placed
- **OrderTracking.jsx** — UC4: Customer enters order ID, sees status
- **InventoryPage.jsx** — UC3: Ops dashboard (inventory levels, low-stock alerts, restock)
- **OrdersPage.jsx** — Unclear; may be part of ops dashboard for order queue

### Router Registration (main.py)

Routes are conditionally loaded:
```python
try:
    from api.orders import router as orders_router
    app.include_router(orders_router, tags=["UC1-Orders", "UC4-Tracking"])
except Exception:
    # Handle missing router

try:
    from uc2_promotions.api.coupons import router as coupons_router
    app.include_router(coupons_router, tags=["UC2-Promotions"])
except Exception:
    pass

try:
    from uc3_inventory.api.inventory import router as inventory_router
    app.include_router(inventory_router, tags=["UC3-Inventory"])
except Exception:
    pass
```

This means UC4 can add endpoints to the existing `api/orders.py` (which already has UC1 orders) without breaking the loader.

---

## UC4 Dependencies & Integration Points

### What UC4 Needs (Dependencies)

1. **From UC1 (Order Creation)**
   - Order must be created first with initial status = "pending"
   - UC1 creates order via `POST /orders`
   - UC4 reads order status via `GET /orders/{order_id}`
   - **Status:** UC1 already creates orders; UC4 just needs to read them

2. **From UC3 (Ops Dashboard Context)**
   - Ops managers view order queue on UC3's dashboard
   - UC4 provides order tracking for ops (status update, order filtering)
   - **Status:** UC3 creates inventory dashboard; UC4 provides order management components

3. **From Shared Database**
   - Reads/writes to `orders` table (status, updated_at)
   - Reads from `order_items`, `products`, `customers` tables
   - **Status:** Schema already defined; no changes needed

4. **From Shared ORM Models**
   - Uses `Order`, `OrderItem`, `Customer`, `Product` models
   - **Status:** Already defined in `backend/shared/models.py`

### What UC4 Provides (Integration Points)

1. **For UC1**
   - Endpoint to retrieve order status after creation
   - Order confirmation page links to tracking page
   - **Non-blocking:** UC1 doesn't depend on UC4; UC4 just adds tracking

2. **For UC3 (Ops Dashboard)**
   - Endpoints for order queue (list orders, filter by status)
   - Endpoint to update order status (pending → shipped → delivered)
   - **Non-blocking:** UC3 can have its own dashboard; UC4 provides the backend

3. **For Frontend**
   - Customer order tracking page (search by order ID)
   - Ops order queue + status update UI
   - **Non-blocking:** Frontend can mock UC4 endpoints while backend implements

### What UC4 Does NOT Depend On

- **UC1 stock checking logic** — UC4 only reads orders, doesn't modify stock
- **UC2 coupon logic** — UC4 reads coupon_code from order, doesn't validate it
- **UC3 inventory checking** — UC4 doesn't verify stock during status updates

---

## Implementation Strategy: Phases

### Phase 1: Backend Core (Can Start Now)

**Goal:** Implement UC4 backend endpoints with full database integration

**What to build:**
1. Enhance `backend/api/orders.py` with complete UC4 endpoints:
   - `GET /orders/{order_id}` — Fetch order details (already stubbed, complete it)
   - `PATCH /orders/{order_id}/status` — Update status with validation (already stubbed, complete it)
   - `GET /customers/{customer_id}/orders` — Fetch customer's order history (already stubbed, complete it)

2. Enhance `backend/services/order_service.py` with UC4 service methods:
   - `get_order(db, order_id)` — Fetch order with items + customer info
   - `get_customer_orders(db, customer_id)` — Fetch customer's order history
   - `update_order_status(db, order_id, new_status)` — Update status with validation (prevent invalid transitions)

3. Ensure status transition validation:
   - Valid transitions: pending → confirmed → shipped → delivered (no backwards)
   - Reject invalid transitions with 400 Bad Request

4. **Dependencies:**
   - Only depends on shared models + database
   - Does NOT depend on UC1, UC2, UC3 code
   - Ready immediately; no blocking

**Output:**
- UC4 backend fully functional with any test database
- Ready for integration tests with UC1 (when UC1 provides orders)

---

### Phase 2: Frontend Core (Can Start Now with Mocks)

**Goal:** Implement UI for order tracking without waiting for backend

**What to build:**
1. **Customer Tracking Page** (`frontend/src/pages/OrderTracking.jsx`):
   - Input: Order ID
   - Calls `GET /orders/{order_id}` (mock initially)
   - Displays: Order details, items, current status, created_at
   - Polling: Refresh every 5-10 seconds (mock: random status updates)

2. **Ops Order Queue** (component in `InventoryPage.jsx` or separate `OrdersPage.jsx`):
   - Displays all orders (mock list initially)
   - Filter by status (pending/confirmed/shipped/delivered)
   - Click order → detail modal
   - Status dropdown in modal → submit to `PATCH /orders/{order_id}/status`
   - Auto-refresh every 5 seconds

3. **Mock API client** (`frontend/src/api/uc4-client.js`):
   ```javascript
   // Mock: return hardcoded orders
   getOrder(id) { return {id, customer_id: 1, status: "pending", ...}; }
   getCustomerOrders(customerId) { return [order1, order2, ...]; }
   updateOrderStatus(id, status) { return {id, status, updated_at: ...}; }
   ```

**Dependencies:**
- Only depends on frontend routing (no backend yet)
- Can develop UI against mocks in parallel with backend

**Output:**
- UI fully functional with mock data
- Ready to swap mocks for real API client when backend is ready

---

### Phase 3: Integration (After UC1 Completes)

**Goal:** Connect UC4 backend to real orders created by UC1

**What to verify:**
1. UC1 creates order → UC4 can retrieve it via `GET /orders/{order_id}`
2. Frontend order tracking page → fetches real order from backend
3. Ops queue → shows real orders from database
4. Status update → persists to database, visible in real-time

**Pre-requisites:**
- UC1 must have completed `POST /orders` (creates orders in DB)
- Database must be seeded/populated with test customers

**Output:**
- Full E2E: UC1 creates order → UC4 tracks it

---

### Phase 4: Dashboard Integration (With UC3)

**Goal:** Integrate UC4 order tracking into ops dashboard

**What to verify:**
1. UC3 ops dashboard includes order queue component
2. Ops can update order status from dashboard
3. Low-stock alerts + order queue coexist without interference

**Pre-requisites:**
- UC3 ops dashboard must exist and be functional

**Output:**
- Unified ops dashboard: inventory management + order tracking

---

## File Organization Plan

### Backend Files to Create/Modify

**Existing file (modify to complete UC4 endpoints):**
- `backend/api/orders.py` — Add/complete UC4 endpoints (GET order, PATCH status, GET customer orders)

**Existing service (modify to add UC4 logic):**
- `backend/services/order_service.py` — Add UC4 service methods (get_order, get_customer_orders, update_status)

**New UC4-specific directory (optional, for organization):**
- `backend/uc4_order_tracking/` (mirrors uc2_promotions, uc3-inventory structure)
  - `api/` — Could move UC4 endpoints here (but NOT required; can stay in api/orders.py)
  - `services/` — Could have UC4-specific services (but order_service.py is already shared)
  - `tests/` — UC4 tests

**NOT modifying:**
- `backend/shared/models.py` — Order, OrderItem, Customer models already defined
- `backend/shared/schemas.py` — Order schemas already defined
- `database/schema.sql` — Schema already correct
- `api-contracts/openapi-spec.yaml` — Contracts already defined

### Frontend Files to Create/Modify

**New file:**
- `frontend/src/api/uc4-client.js` — API client for UC4 endpoints

**Existing file (modify):**
- `frontend/src/pages/OrderTracking.jsx` — Implement customer order tracking page (already exists, may need enhancement)

**Existing file (create or modify):**
- `frontend/src/pages/OrdersPage.jsx` or `InventoryPage.jsx` — Add ops order queue

**New components (optional, for reusability):**
- `frontend/src/components/OrderQueue.jsx` — Already exists; may need enhancement
- `frontend/src/components/OrderDetail.jsx` — Already exists; may need enhancement
- `frontend/src/components/OrderStatusFilter.jsx` — Already exists; may need enhancement

**NOT modifying:**
- `frontend/src/pages/ProductList.jsx`, `Cart.jsx`, `Checkout.jsx` — UC1 pages
- `frontend/src/pages/InventoryPage.jsx` — UC3 pages (but could add order queue as tab or sidebar)

---

## Implementation Sequence

### Step 1: Confirm Empty State
- Verify `backend/uc4-order-tracking/` is empty (just README)
- Verify `backend/api/orders.py` has stubbed UC4 endpoints
- Verify existing models/schemas are sufficient

### Step 2: Complete Backend Endpoints (No Dependencies)
- Implement `GET /orders/{order_id}` in `api/orders.py`
- Implement `PATCH /orders/{order_id}/status` in `api/orders.py`
- Implement `GET /customers/{customer_id}/orders` in `api/orders.py`
- Add service methods in `services/order_service.py`
- Write unit tests in `backend/tests/test_order_service.py`

### Step 3: Test Backend with Mocks
- Use seeded test data from database (customers, products already inserted)
- Create test orders manually via `POST /orders` (if UC1 available) or via SQL
- Test UC4 endpoints independently

### Step 4: Frontend Mock Implementation
- Implement `frontend/src/api/uc4-client.js` (mock initially)
- Implement/enhance `frontend/src/pages/OrderTracking.jsx`
- Implement/enhance `frontend/src/pages/OrdersPage.jsx` (ops queue)
- Test UI with mock data

### Step 5: Integration Testing
- Swap frontend mock client to real API client
- Test E2E: UC1 creates order → UC4 retrieves it
- Test E2E: Ops updates status → Customer sees update

### Step 6: Dashboard Integration
- Integrate order queue into UC3 ops dashboard (if needed)
- Verify no conflicts with UC3 functionality

---

## Key Design Decisions

### 1. Where to Put UC4 Code?

**Option A (Recommended):** Keep in existing `api/orders.py` and `services/order_service.py`
- **Pro:** Minimal file creation; endpoints are already tagged with "UC4-Tracking"
- **Pro:** Easy integration with UC1 (both share order management)
- **Con:** File grows larger (but manageable)
- **Decision:** Use existing files. Later, if UC4 grows, move to `uc4_order_tracking/` directory.

**Option B:** Create `uc4_order_tracking/` directory (mirrors UC2, UC3)
- **Pro:** Clear separation; easy to identify UC4-specific code
- **Pro:** Can evolve independently
- **Con:** Adds more files; requires path updates in main.py
- **Decision:** Not needed initially; can refactor later if beneficial.

### 2. Status Validation Strategy

**Approach:** Validate transitions in service layer

```python
VALID_TRANSITIONS = {
    "pending": ["confirmed"],
    "confirmed": ["shipped"],
    "shipped": ["delivered"],
    "delivered": [],  # Terminal state
}

def update_order_status(db, order_id, new_status):
    order = get_order(db, order_id)
    if new_status not in VALID_TRANSITIONS.get(order.status, []):
        raise InvalidStatusTransitionError(...)
    order.status = new_status
    order.updated_at = datetime.utcnow()
    db.commit()
    return order
```

**Why:** Already defined in `Order.can_transition_to()` method; reuse it.

### 3. Polling vs. WebSockets for Real-Time Updates

**Approach:** Start with polling (simpler), add WebSockets later if needed

- **Phase 1–3:** Frontend polls `GET /orders/{order_id}` every 5–10 seconds
- **Phase 4+:** Consider WebSocket for real-time updates (not in scope)

**Why:** Polling is sufficient for MVP; WebSocket adds complexity without blocking.

### 4. Authorization

**Approach:** Assume no auth in MVP (can add later)

- `GET /orders/{order_id}` — Anyone can view (assume customer owns it, no auth check yet)
- `PATCH /orders/{order_id}/status` — Assume ops only (no auth check; add later if needed)
- `GET /customers/{customer_id}/orders` — Anyone can view (assume customer owns it, no auth check yet)

**Why:** OpenAPI spec doesn't mandate auth; can add middleware later.

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| UC1 not ready (orders not created) | UC4 endpoints return empty/not found | Mock test data in Phase 1; real data when UC1 ready |
| UC1 creates orders with different schema | UC4 can't read orders | Use shared Order model; API contract defines schema |
| Concurrent status updates (race condition) | Last-write-wins; status could be inconsistent | Add optimistic locking or SELECT FOR UPDATE if needed |
| Frontend polling too frequent | Backend load increases | Start with 5–10s poll interval; monitor & adjust |
| Status transition rules change | UC4 validation becomes outdated | Update Order.can_transition_to() once; all code reuses it |

---

## Integration Checklist (For Later)

When UC1–3 are ready:

- [ ] UC1: `POST /orders` creates orders with status = "pending"
- [ ] UC1: Order is visible in database immediately after creation
- [ ] UC4: `GET /orders/{order_id}` retrieves order created by UC1
- [ ] UC4: `PATCH /orders/{order_id}/status` updates order status
- [ ] UC3: Ops dashboard can see order queue (UC4 data)
- [ ] UC3: Ops can update order status via UC4 endpoint
- [ ] Frontend: OrderTracking page shows real orders (not mocks)
- [ ] Frontend: Ops queue shows real orders from backend
- [ ] E2E: Customer places order → can track status in real-time
- [ ] E2E: Ops updates status → customer sees update immediately

---

## Summary: What You Can Start Now

**Backend (No Dependencies):**
✅ Complete `GET /orders/{order_id}`  
✅ Complete `PATCH /orders/{order_id}/status` with transition validation  
✅ Complete `GET /customers/{customer_id}/orders`  
✅ Write service methods in `order_service.py`  
✅ Write unit tests  

**Frontend (Can Mock):**
✅ Implement `OrderTracking.jsx` with mock API  
✅ Implement/enhance ops order queue with mock API  
✅ Test UI with hardcoded sample data  

**After UC1 Ready:**
✅ Test UC4 backend with real orders from UC1  
✅ Swap frontend mock client to real API  
✅ E2E testing  

---

## Next Steps

1. **Review this analysis** — Confirm strategy aligns with your vision
2. **Ask clarifying questions** — About dependencies, scope, or design decisions
3. **Approve phase 1** — Once confirmed, proceed with backend implementation
4. **Implement iteratively** — Each phase is self-contained and testable

**Ready to proceed?** Let me know which phase to start with and I'll ask for approval before each significant change.
