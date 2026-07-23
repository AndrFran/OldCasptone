# START HERE: Vibe Strike E-Commerce Capstone

Welcome! This document guides you through the entire project structure and how to get started.

## What Is This Project?

**Vibe Strike** is a real-time e-commerce backend for order and inventory management. **4 independent use cases** are developed in parallel by different teams/systems, with **shared API contracts** and **database schema** that enable seamless integration.

**Timeline:** 4 hours from start to demo  
**Constraint:** Each UC team develops independently without blocking others

---

## The 4 Use Cases (4 Teams)

### UC1: Browse Products & Place Order
**What:** Customers browse products and place orders  
**Challenge:** Prevent overselling (last unit race condition)  
**Team:** 1 backend engineer + 1 frontend engineer  
**See:** `backend/uc1-browse-order/README.md`

### UC2: Discounts & Coupon Codes
**What:** Coupons validated and discounts applied automatically at checkout  
**Challenge:** Integrate discount logic with UC1 order placement  
**Team:** 1 backend engineer + 1 frontend engineer  
**See:** `backend/uc2-promotions/README.md`

### UC3: Inventory Management & Alerts
**What:** Ops managers view inventory levels and see low-stock alerts  
**Challenge:** Show real-time inventory (visible on UC1 product pages)  
**Team:** 1 backend engineer + 1 frontend engineer (ops dashboard)  
**See:** `backend/uc3-inventory/README.md`

### UC4: Order Status Tracking
**What:** Ops managers and customers track orders from pending to delivered  
**Challenge:** Create order in UC1, track in UC4, update in ops dashboard (UC3)  
**Team:** 1 backend engineer + 1 frontend engineer  
**See:** `backend/uc4-order-tracking/README.md`

---

## Getting Started in 3 Steps

### Step 1: Read the Architecture Docs (10 min)

Start with these in order:

1. **[CLAUDE.md](CLAUDE.md)** (2 min)
   - Team roles
   - Tech stack (FastAPI, PostgreSQL, React)
   - Quick overview of 4 UCs

2. **[PARALLEL_DEVELOPMENT.md](PARALLEL_DEVELOPMENT.md)** (5 min)
   - How 4 teams work independently
   - Shared API contracts
   - Shared database schema
   - Mock-first approach

3. **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** (3 min)
   - How UCs integrate together
   - End-to-end customer journey
   - Common integration issues

### Step 2: Set Up Your Environment (20 min)

Follow [README.md](README.md) Quick Start section:

```bash
# 1. Database
createdb vibestrike
psql vibestrike < database/schema.sql

# 2. Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Step 3: Choose Your Role & Read UC README (10 min)

Based on which UC you're implementing, read its README:

- **UC1:** [backend/uc1-browse-order/README.md](backend/uc1-browse-order/README.md)
- **UC2:** [backend/uc2-promotions/README.md](backend/uc2-promotions/README.md)
- **UC3:** [backend/uc3-inventory/README.md](backend/uc3-inventory/README.md)
- **UC4:** [backend/uc4-order-tracking/README.md](backend/uc4-order-tracking/README.md)

Each README has:
- Use case description
- Key technical challenge
- API endpoints you'll implement
- Testing scenarios
- Database tables you'll use

---

## Shared Resources (Read-Only)

These files are shared by all 4 UC teams. **Don't modify without team consensus.**

### API Contracts
**File:** `api-contracts/openapi-spec.yaml`  
**What:** Complete OpenAPI 3.0 specification for all endpoints  
**Why:** Defines the boundary between teams. If UC1 needs an endpoint, it must be in this spec.  
**Change Process:** 1) Discuss with team lead 2) Update spec 3) All teams implement to spec

### Database Schema
**File:** `database/schema.sql`  
**What:** All tables (products, orders, coupons, inventory, customers)  
**Why:** All teams read/write the same database  
**Change Process:** 1) Discuss with team lead 2) Add to schema 3) Run migration

### ORM Models
**File:** `backend/shared/models.py`  
**What:** SQLAlchemy models for products, orders, coupons, etc.  
**Why:** All UC teams import from here, ensures consistency  
**Change Process:** 1) Add to `backend/shared/models.py` 2) Commit 3) All teams pull

---

## Architecture at a Glance

```
┌─────────────────────────────────────────────┐
│         Frontend (React)                    │
│  UC1          UC2           UC3      UC4    │
│  Products     Coupons       Ops      Track  │
└─────────────────────────────────────────────┘
           ↓ HTTP REST Calls ↓
┌─────────────────────────────────────────────┐
│      FastAPI Backend (main.py)              │
│  ┌──────┐  ┌─────────┐  ┌─────┐  ┌──────┐ │
│  │UC1   │  │UC2      │  │UC3  │  │UC4   │ │
│  │Prod  │  │Coupon   │  │Inv  │  │Order │ │
│  │Order │  │Discount │  │Low  │  │Track │ │
│  └──────┘  └─────────┘  └─────┘  └──────┘ │
│                                             │
│     Shared: models.py, db.py, config.py    │
└─────────────────────────────────────────────┘
         ↓ SQLAlchemy ORM ↓
┌─────────────────────────────────────────────┐
│      PostgreSQL Database                    │
│  products | orders | coupons | customers   │
└─────────────────────────────────────────────┘
```

---

## Development Timeline (4 Hours)

| Phase | Time | What | Who |
|-------|------|------|-----|
| **Design** | 0:00–0:30 | API spec, DB schema finalized | Architecture designer |
| **Backend** | 0:30–1:30 | All 4 UC endpoints + DB layer | 4 backend engineers (parallel) |
| **Frontend** | 1:30–2:30 | All 4 UC UIs (can use mocks) | 4 frontend engineers (parallel) |
| **Integration** | 2:30–3:30 | Connect real DB, test E2E flows | Integration tester |
| **Polish** | 3:30–4:00 | Fix bugs, refine UI, demo prep | All |

---

## Key Technical Decisions

### Race Condition Prevention (UC1 ↔ UC3)

**Problem:** Two customers buy the last product unit simultaneously

**Solution:** Atomic SQL UPDATE
```sql
UPDATE products SET stock = stock - :qty 
WHERE id = :product_id AND stock >= :qty
```

- If stock < qty → 0 rows affected → return 400 "Out of Stock"
- If stock >= qty → 1 row affected → order succeeds
- Only one transaction succeeds atomically

### Coupon Auto-Application (UC1 ↔ UC2)

**Flow:**
1. Customer enters coupon code on UC1 checkout
2. UC1 calls UC2: `POST /coupons/validate { code }`
3. UC2 returns: `{ valid: true, discount_type: "percent", value: 10 }`
4. UC1 calculates discount and creates order with reduced total

### Inventory Visibility (UC1 ↔ UC3)

**Flow:**
1. UC1 displays products with stock level from `products.stock`
2. When UC1 creates order, it decrements stock atomically
3. UC3 dashboard queries same `products` table → sees updated inventory
4. No additional sync needed (single source of truth)

### Order Lifecycle (UC1 → UC4)

**Flow:**
1. UC1 `POST /orders` creates order with status = "pending"
2. Customer gets order ID
3. UC4 `GET /orders/{id}` retrieves order (can see items, total, status)
4. Ops manager (UC3) can update status: pending → shipped → delivered
5. Customer tracking page (UC4) shows real-time status

---

## Project Folders Explained

### `api-contracts/`
Shared API specification. All endpoints defined here before any code is written.

### `database/`
PostgreSQL schema. All UC teams query/update the same tables.

### `backend/uc1-*`, `backend/uc2-*`, etc.
Each UC team's backend code:
- `api/` — FastAPI endpoints (must follow openapi-spec.yaml)
- `services/` — Business logic
- `tests/` — Unit tests for this UC

### `backend/shared/`
Code shared by all UC teams:
- `models.py` — SQLAlchemy ORM (Product, Order, Coupon, etc.)
- `db.py` — Database connection & session management
- `exceptions.py` — Custom exception classes

### `frontend/src/pages/uc1-*`, `uc2-*`, etc.
Each UC team's frontend code:
- Product pages, cart, checkout (UC1)
- Coupon input field (UC2)
- Ops inventory dashboard (UC3)
- Order tracking page (UC4)

### `tests/integration/`
Cross-UC tests that verify entire system works:
- UC1 creates order → UC3 inventory decrements → UC4 tracks it ✅
- UC1 + UC2: coupon applied at checkout ✅
- Race condition: 2 orders for last unit → only 1 succeeds ✅

---

## Common Questions

**Q: Can my UC team start without waiting for others?**  
A: Yes! Use mock implementations first. UC1 can mock products, UC2 can mock coupons, etc. Frontend develops UI against mocks. When backend is ready, switch to real DB. See PARALLEL_DEVELOPMENT.md for details.

**Q: What if I need to change the API spec?**  
A: Discuss with team lead. The spec is the contract. Changes must be coordinated so all teams implement consistently.

**Q: What if I need a new database table?**  
A: Don't add tables without consensus. Talk to team lead first. If truly needed, update `database/schema.sql` and all teams re-run migrations.

**Q: How do I run the full system end-to-end?**  
A: 1) Start backend: `uvicorn backend/main:app --reload` 2) Start frontend: `npm run dev` 3) Open browser to `http://localhost:5173` 4) Click through customer flow and ops dashboard

**Q: Where do I put my code?**  
A: If you're on UC1 backend → `backend/uc1-browse-order/api/` for endpoints, `backend/uc1-browse-order/services/` for logic.

---

## Next Steps

1. ✅ **You've read START_HERE.md** (this file)
2. 📖 **Read [CLAUDE.md](CLAUDE.md)** (team roles, tech stack)
3. 📖 **Read [PARALLEL_DEVELOPMENT.md](PARALLEL_DEVELOPMENT.md)** (how teams coordinate)
4. 🔧 **Set up environment** (database + backend + frontend)
5. 📖 **Read your UC's [backend/uc*/README.md](backend/)**
6. 💻 **Start implementing** (mock endpoints first)
7. 🧪 **Test end-to-end** (see INTEGRATION_GUIDE.md)
8. 🎬 **Demo** (follow checklist in README.md)

---

## Files Summary

| File | Purpose | Audience |
|------|---------|----------|
| [START_HERE.md](START_HERE.md) | **You are here** | Everyone (first read) |
| [CLAUDE.md](CLAUDE.md) | Team roles, tech stack, UC overview | Everyone |
| [PARALLEL_DEVELOPMENT.md](PARALLEL_DEVELOPMENT.md) | How 4 teams work independently | Everyone |
| [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) | How UCs integrate, E2E flows, troubleshooting | Everyone (especially integration tester) |
| [TECH_STACK.md](TECH_STACK.md) | Detailed tech decisions, timelines | Backend/frontend engineers |
| [README.md](README.md) | Quick start, project structure, demo checklist | Everyone |
| [api-contracts/openapi-spec.yaml](api-contracts/openapi-spec.yaml) | API specification | All backend teams |
| [database/schema.sql](database/schema.sql) | Database schema | All teams |
| [backend/uc*/README.md](backend/) | UC-specific deliverables | That UC's team |

---

**Good luck! 🚀 Remember: Keep it simple, test frequently, integrate early.**
