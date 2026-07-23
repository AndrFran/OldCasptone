# Vibe Strike: Order & Inventory Engine — Analysis & Subagent Strategy

## Problem Decomposition

### Core Challenges
1. **Real-time Inventory Management** — Handle concurrent orders with atomicity (prevent overselling)
2. **Order Lifecycle Management** — Track orders from placement to delivery
3. **Promotion Engine** — Apply discounts/coupons automatically at checkout
4. **User-Facing Frontend** — Customer storefront + ops manager dashboard
5. **API Contract** — Complete OpenAPI spec for all endpoints

### Success Criteria (50 pts)
- ✅ **Functionality (15 pts)** — All 4 use cases work live, including Claude-API integration
- ✅ **Architecture Diagram (10 pts)** — Accurate reflection of actual build
- ✅ **Frontend/Usability (10 pts)** — Client-ready appearance, intuitive navigation
- ✅ **Claude Code Usage (10 pts)** — Applied across full stack
- ✅ **Integration & Polish (5 pts)** — Zero mid-demo bugs, seamless operation

---

## Subagent Workflow Structure

### Phase 1: Architecture Design
**Agent:** Architecture Designer  
**Output:** System design blueprint

**Responsibilities:**
- Define service boundaries (Order, Inventory, Promotion services)
- Design database schema (tables, relationships, indexes)
- Specify API endpoint structure
- Identify race-condition prevention strategy
- Map Claude API integration point

**Key Decisions:**
- How to handle "last unit" concurrent orders? (Optimistic locking vs. pessimistic locking vs. database transactions)
- Which service owns what responsibility?
- How do services communicate? (Direct calls, events, queues?)

---

### Phase 2: Backend Services (Parallel)
**Agents:** 
- Order Service Engineer
- Inventory Service Engineer
- Promotion Service Engineer
- Database Layer Engineer

**Order Service:**
- Order model (id, customerId, items[], status, total)
- Create order (with atomic inventory check)
- Get/update order status
- List customer orders
- Error handling (out-of-stock, invalid coupon)

**Inventory Service:**
- Inventory model (productId, quantity, lowStockThreshold)
- Check stock
- Reserve stock (atomic decrement)
- Get inventory levels
- Low-stock alerts
- Restock operations
- **Concurrency safety:** Optimistic locking or database-level transactions

**Promotion Service:**
- Coupon model (code, discountType, value, expiresAt, usage)
- Validate coupon (expiry, usage limits)
- Apply discount
- List promotions
- **Optional:** Claude API for intelligent coupon suggestions

**Database Layer:**
- Connection setup
- Schema migration
- Transaction handling
- Query layer abstraction
- Error handling

---

### Phase 3: API & Specification
**Agent:** API Specialist  
**Output:** Complete OpenAPI 3.0 spec + implementation

**Endpoints:**
1. `GET /products` — list products with stock
2. `GET /products/:id` — product details
3. `POST /orders` — place order
4. `GET /orders/:id` — order status
5. `GET /customers/:customerId/orders` — customer order history
6. `PATCH /orders/:id/status` — update status (ops only)
7. `GET /inventory` — inventory levels (ops only)
8. `PATCH /inventory/:productId` — restock (ops only)
9. `GET /inventory/low-stock` — alerts (ops only)
10. `POST /coupons/validate` — validate code
11. `GET /promotions` — list active promotions

**OpenAPI Spec Must Include:**
- Clear descriptions
- Request/response schemas
- Error responses (400, 404, 409 race condition, 401 auth)
- Authentication requirements
- Rate limiting notes

---

### Phase 4: Frontend (Parallel)
**Agents:**
- Customer Frontend Engineer
- Ops Manager Dashboard Engineer

**Customer Frontend:**
- Product listing (search, filter, stock visibility)
- Product detail page
- Shopping cart (add/remove items, quantity)
- Coupon code input at checkout
- Order confirmation (order ID, total, ETA)
- Order tracking (paste order ID to see status)
- Responsive, clean UI (client-ready)

**Ops Manager Dashboard:**
- Inventory overview (table/cards of all products and levels)
- Low-stock alerts (highlighted, actionable)
- Restock form (add inventory)
- Order queue (live list with status filters)
- Order detail view (customer info, items, tracking)
- Status update controls (pending → shipped → delivered)
- Basic auth (email/password login)

---

### Phase 5: Integration & Testing
**Agent:** Integration Tester  
**Output:** E2E test report, integration fixes, architecture diagram

**Test Scenarios:**
1. **Happy Path:** Customer browses → adds item → applies coupon → places order → ops sees it → updates status → customer tracks
2. **Race Condition:** Two simultaneous orders for last unit → only one succeeds, one gets 409 error
3. **Inventory Accuracy:** Stock decrements correctly on order, restock increments work
4. **Coupon Logic:** Valid coupon applies discount, expired/used-up coupon rejected
5. **Low-Stock Alerts:** Ops sees alert when inventory < threshold
6. **Order Tracking:** Order status changes propagate to customer view
7. **Error Handling:** Invalid orders (bad coupon, out of stock, missing fields) return proper 4xx errors

**Deliverables:**
- Test scenarios checklist (pass/fail)
- Integration patches (if needed)
- Architecture diagram (ASCII or text, reflects actual build)
- Performance notes (no slow queries, no UI lag)

---

## Workflow Execution Flow

```
┌─────────────────────────────────────────────────────────┐
│ Phase 1: Design (Sequential)                            │
│ └─→ Architecture blueprint                              │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────┐
│ Phase 2: Backend Services (Parallel on Architecture)    │
│ ├─→ Order Service                                       │
│ ├─→ Inventory Service (with concurrency strategy)       │
│ ├─→ Promotion Service                                   │
│ └─→ Database Layer                                      │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────┐
│ Phase 3: API Spec (Sequential on Architecture)          │
│ └─→ Complete OpenAPI spec + endpoint implementation     │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────┐
│ Phase 4: Frontend (Parallel on API Spec)                │
│ ├─→ Customer Storefront                                 │
│ └─→ Ops Manager Dashboard                               │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────┐
│ Phase 5: Integration & E2E Testing (Sequential)         │
│ └─→ Test report, patches, architecture diagram          │
└─────────────────────────────────────────────────────────┘
```

---

## Key Technical Decisions

### Race Condition Handling (Critical for Use Case #1)

**Scenario:** Two customers try to buy the last unit simultaneously.

**Solutions:**
1. **Database-level Transactions (Recommended)**
   - Use `BEGIN TRANSACTION` → check stock → decrement → `COMMIT`
   - Database ensures atomicity; second order sees 0 stock and fails
   - Error: 409 Conflict (stock unavailable)

2. **Optimistic Locking**
   - Store `version` field on inventory row
   - Check: `SELECT * FROM inventory WHERE productId=X AND version=V`
   - Update: `UPDATE inventory SET quantity=Q, version=V+1 WHERE productId=X AND version=V`
   - Second transaction fails on version mismatch, retries/fails with 409

3. **Pessimistic Locking (Row Lock)**
   - `SELECT * FROM inventory WHERE productId=X FOR UPDATE` (locks row)
   - Decrement quantity
   - Second transaction waits for lock, then sees 0 stock
   - Simpler but potentially slower

**Recommendation:** Database transactions (simplest, atomic, tested).

---

### Claude API Integration Point

**Option 1: Intelligent Coupon Recommendations**
- When customer adds items to cart, call Claude to suggest matching coupons
- Claude analyzes cart contents (electronics, clothing, etc.) and recommends relevant promotions
- Improves checkout conversion

**Option 2: Order Summarization**
- When ops manager views order, Claude generates human-readable summary of large/complex orders
- E.g., "Customer ordered 5× Widget A and 2× Widget B totaling $250 with 10% discount applied"

**Option 3: Inventory Optimization**
- Periodically call Claude to analyze order patterns and suggest restock levels
- E.g., "Widget A sells 10/day; current stock is 5; recommend restock to 50 units"

**Recommendation:** Option 1 (coupon recommendations) — adds real value at checkout, directly tied to revenue.

---

## File Structure (Target)

```
capsotne/
├── backend/
│   ├── services/
│   │   ├── orderService.js
│   │   ├── inventoryService.js
│   │   ├── promotionService.js
│   │   └── database.js
│   ├── models/
│   │   ├── Order.js
│   │   ├── Inventory.js
│   │   └── Coupon.js
│   ├── routes/
│   │   └── api.js
│   └── server.js
├── frontend/
│   ├── customer/
│   │   ├── ProductListing.jsx
│   │   ├── Cart.jsx
│   │   ├── Checkout.jsx
│   │   └── OrderTracking.jsx
│   ├── ops/
│   │   ├── Dashboard.jsx
│   │   ├── InventoryView.jsx
│   │   └── OrderQueue.jsx
│   └── App.jsx
├── openapi.yaml
├── PROJECT_ANALYSIS.md (this file)
└── README.md
```

---

## Next Steps

1. **Run workflow:** Execute `.claude/workflows/ecommerce-capstone.js` to spawn all agents
2. **Collect outputs:** Aggregate architecture, code, API spec from all agents
3. **Implement:** Write/modify files based on agent recommendations
4. **Test:** Run through all 5 test scenarios
5. **Demo:** Show customer UI, ops dashboard, real-time inventory update, race condition handling
6. **Document:** Create architecture diagram and README

---

## Grading Alignment

| Criterion | How Addressed |
|-----------|---------------|
| **Functionality (15 pts)** | All 4 use cases coded and tested; Claude API integration in promotion service |
| **Architecture Diagram (10 pts)** | Integration agent creates accurate diagram of actual build |
| **Frontend/Usability (10 pts)** | Two parallel frontend agents ensure customer UI + ops dashboard both polished |
| **Claude Code Usage (10 pts)** | Used across backend (services), frontend (components), and testing phases |
| **Integration & Polish (5 pts)** | Dedicated integration phase tests all scenarios and fixes bugs pre-demo |

