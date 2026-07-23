# Vibe Strike Project Startup Skill

## Overview
Quick setup for new developers joining the Vibe Strike project. This skill automates the learning path and environment setup for the 4-hour capstone project.

## When to Use
- New team member joining the project
- Starting work on a specific UC (use case)
- Need to refresh understanding of project architecture
- Setting up local development environment

## 3-Step Startup Process

### Step 1: Architecture Foundations (10 min)
Learn the project structure and how teams work independently:

1. **CLAUDE.md** (2 min)
   - Team roles and responsibilities
   - Tech stack overview (FastAPI, PostgreSQL, React)
   - Quick 4 UC overview

2. **PARALLEL_DEVELOPMENT.md** (5 min)
   - How 4 teams work in parallel
   - Shared API contracts (`api-contracts/openapi-spec.yaml`)
   - Shared database schema (`database/schema.sql`)
   - Mock-first development approach

3. **INTEGRATION_GUIDE.md** (3 min)
   - How UCs integrate together
   - End-to-end customer journey
   - Common integration issues and solutions

### Step 2: Local Environment Setup (20 min)

#### Prerequisites
- PostgreSQL installed locally OR use cloud DB (Supabase/Neon/Render)
- Python 3.9+ installed
- Node.js 16+ installed
- Git configured

#### Database Setup
```bash
# Option 1: Local PostgreSQL
createdb vibestrike
psql vibestrike < database/schema.sql

# Option 2: Cloud Database
# Create Supabase/Neon project, get connection string
# Update backend/.env with DATABASE_URL
```

#### Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Initialize database schema (create all tables)
python -c "from shared.migrations import init_schema; init_schema()"

# Seed database with test data (users, products, coupons, customers)
python -c "from shared.migrations import reset_and_seed; reset_and_seed()"

# Start FastAPI dev server (auto-reload enabled)
uvicorn main:app --reload
# ✅ Backend running at http://localhost:8000
# ✅ API docs (Swagger) at http://localhost:8000/docs
```

**What Gets Seeded:**
- 3 test users: 2 customers (alice@example.com, bob@example.com) + 1 ops manager (ops@example.com) — all with password `password123`
- 10+ trucker cap products with prices, stock levels, images, and themes
- 5 sample customers with email addresses
- 3 active coupon codes: `WELCOME10` (10% off), `SUMMER20` (20% off), `FREESHIP` (free shipping)
- Stock levels with low-stock thresholds for inventory alerts

#### Frontend Setup (new terminal)
```bash
cd frontend
npm install
npm run dev
# ✅ Frontend running at http://localhost:5173
```

#### Verify Setup
```bash
# Backend health check
curl http://localhost:8000/docs

# Frontend health check
# Visit http://localhost:5173 in browser
```

### Step 3: Choose Your Role & Deep Dive (10 min)

Pick your UC and read its detailed README:

#### UC1: Browse Products & Place Order
**Team:** 1 backend engineer + 1 frontend engineer  
**Challenge:** Prevent race conditions on last unit  
**Read:** `backend/uc1-browse-order/README.md`  
**Key Files:**
- `backend/uc1-browse-order/api/` — REST endpoints
- `backend/uc1-browse-order/services/` — Business logic
- `frontend/src/pages/uc1-products/` — Product UI

#### UC2: Discounts & Coupon Codes
**Team:** 1 backend engineer + 1 frontend engineer  
**Challenge:** Integrate coupon validation with UC1 checkout  
**Read:** `backend/uc2-promotions/README.md`  
**Key Files:**
- `backend/uc2-promotions/api/` — Coupon endpoints
- `backend/uc2-promotions/services/` — Discount logic
- `frontend/src/pages/uc2-coupons/` — Coupon UI

#### UC3: Inventory Management & Alerts
**Team:** 1 backend engineer + 1 frontend engineer  
**Challenge:** Real-time inventory visibility  
**Read:** `backend/uc3-inventory/README.md`  
**Key Files:**
- `backend/api/inventory.py` — Inventory endpoints
- `backend/uc3-inventory/services/` — Stock management
- `frontend/src/pages/InventoryDashboard.jsx` — Ops dashboard

#### UC4: Order Status Tracking
**Team:** 1 backend engineer + 1 frontend engineer  
**Challenge:** End-to-end order lifecycle (pending → confirmed → shipped → delivered)  
**Read:** `backend/uc4-order-tracking/README.md`  
**Key Files:**
- `backend/api/orders.py` — Order endpoints (create, get, update status)
- `frontend/src/pages/OrderTracking.jsx` — Customer order tracking page
- `frontend/src/pages/OpsDashboard.jsx` — Ops order queue & status updates

**Key Endpoints:**
- `GET /orders/{id}` — Customer: Track order by ID
- `GET /orders` — Ops: View all orders with status
- `PATCH /orders/{id}/status` — Ops: Update order status

## Architecture at a Glance

```
┌──────────────────────────────────────────────────────┐
│         Frontend (React + Vite)                      │
│  UC1          UC2          UC3          UC4          │
│  Products     Coupons      Ops Mgr      Tracking     │
│  + Cart       + Discounts   + Inventory  + Orders    │
└──────────────────────────────────────────────────────┘
           ↓ HTTP REST (OpenAPI) ↓
┌──────────────────────────────────────────────────────┐
│      FastAPI Backend (main.py)                       │
│  ┌──────────┐  ┌────────┐  ┌────────┐  ┌────────┐  │
│  │UC1+UC4   │  │UC2     │  │UC3     │  │UC4     │  │
│  │Orders    │  │Coupon  │  │Invnty  │  │Status  │  │
│  │API       │  │API     │  │API     │  │Update  │  │
│  └──────────┘  └────────┘  └────────┘  └────────┘  │
│       Shared: models.py, db.py, queries.py          │
└──────────────────────────────────────────────────────┘
           ↓ SQLAlchemy ORM ↓
┌──────────────────────────────────────────────────────┐
│      PostgreSQL Database                            │
│  products | orders | coupons | customers            │
│  order_items | coupons_applied | order_status      │
└──────────────────────────────────────────────────────┘
```

## Use Case Integration Map

| UC | Frontend | Backend | Purpose | Integrates With |
|----|----------|---------|---------|-----------------|
| **UC1** | ProductList, Cart, Checkout | POST /orders, GET /products | Browse & order | UC2 (coupons), UC4 (tracking) |
| **UC2** | Coupon input field | POST /coupons/validate | Discount codes | UC1 (checkout) |
| **UC3** | InventoryDashboard, OpsDashboard | GET /inventory, PATCH /orders/{id}/status | Ops manager view | UC1 (stock), UC4 (order updates) |
| **UC4** | OrderTracking, OpsDashboard orders | GET /orders, PATCH /orders/{id}/status | Order tracking | UC1 (creates orders), UC3 (status updates) |

## Shared Resources (All Teams Use)

### API Contracts
**File:** `api-contracts/openapi-spec.yaml`  
**What:** OpenAPI 3.0 specification defining all endpoints  
**Why:** Contract between teams — if you need an endpoint, it must be here first  
**Usage:** All backend code implements this spec exactly

### Database Schema
**File:** `database/schema.sql`  
**What:** PostgreSQL tables for products, orders, coupons, inventory  
**Why:** All teams query/update the same database  
**Usage:** Run migrations before starting development

### Shared Models
**File:** `backend/shared/models.py`  
**What:** SQLAlchemy ORM models (Product, Order, Coupon, etc.)  
**Why:** Ensures consistency across all UC teams  
**Usage:** Import models from `backend.shared.models`

## Key Technical Decisions

### Race Condition Prevention (UC1 + UC3)
**Problem:** Two customers buy the last unit simultaneously  
**Solution:** Atomic SQL UPDATE
```sql
UPDATE products SET stock = stock - :qty 
WHERE id = :product_id AND stock >= :qty
```
Result: Only one transaction succeeds, other fails atomically.

### Coupon Integration (UC1 ↔ UC2)
**Flow:** Customer enters coupon → UC1 validates via UC2 → Discount applied at checkout

### Inventory Visibility (UC1 ↔ UC3)
**Flow:** UC1 displays stock from `products.stock` table → UC3 dashboard shows same data → Single source of truth

### Order Lifecycle (UC1 → UC4 ↔ UC3)
**Flow:**
1. UC1 creates order with status: "pending"
2. Customer (UC4) can track order via `/order-tracking` page
3. Ops manager (UC3) can see orders in ops dashboard
4. Ops manager updates status: pending → confirmed → shipped → delivered
5. Customer sees real-time status changes in tracking page
6. Order data in shared `orders` table ensures consistency

## End-to-End Test Flows

### Customer Flow (UC1 + UC2 + UC4)
```
1. Login as alice@example.com
2. Browse products on /
3. Click product → view details
4. Add to cart (1-3 items)
5. Go to /cart → review items
6. Proceed to checkout
7. Enter coupon code: WELCOME10 (10% off)
8. Submit order → see order ID
9. Visit /order-tracking → paste order ID
10. See order status: "pending" with timeline
```

### Ops Manager Flow (UC3 + UC4)
```
1. Login as ops@example.com
2. See ops header with Inventory + Orders Queue links
3. Click Inventory → see all products + stock levels
4. Find low-stock item (stock < threshold) → see alert
5. Click "Restock" → increase stock
6. Go to Orders Queue → see all customer orders
7. Click order → update status: pending → confirmed → shipped
8. Customer sees real-time status change in /order-tracking
```

### Full Integration Test (All 4 UCs)
```
1. Ops: Set up inventory (check stock levels)
2. Customer: Place order with coupon code
3. Ops: See new order in queue
4. Ops: Update order status to "shipped"
5. Customer: Check /order-tracking → see status change
6. Ops: View inventory → confirm stock was decremented
```

## Development Workflow

### Typical Day
1. **Start servers:**
   ```bash
   # Terminal 1: Backend
   cd backend && uvicorn main:app --reload
   
   # Terminal 2: Frontend  
   cd frontend && npm run dev
   ```

2. **Pick a task** from your UC's README

3. **Mock-first approach:**
   - Write mock data in your endpoint
   - Build frontend UI against mock
   - When backend ready, swap in real DB

4. **Test end-to-end:**
   - Start both servers
   - Open http://localhost:5173
   - Run through test flows above

5. **Commit when green:**
   ```bash
   git add .
   git commit -m "UC#: Brief description"
   git push origin feature/uc#-description
   ```

## Fresh Start / Clean Restart

### Kill All Running Instances & Reload
Use this when:
- Backend/frontend stuck or not responding
- Database connection issues
- Need a clean slate to test from scratch

#### Option 1: Windows (PowerShell/Bash)
```bash
# Kill all Python instances (backend)
taskkill /F /IM python.exe

# Kill all Node instances (frontend)
taskkill /F /IM node.exe

# Kill PostgreSQL connections (if local)
taskkill /F /IM postgres.exe
```

#### Option 2: macOS/Linux
```bash
# Kill all Python instances
pkill -f python

# Kill all Node instances
pkill -f node

# Kill PostgreSQL (if running via Homebrew)
brew services stop postgresql
```

### Full Reset Sequence (Recommended)

**Terminal 1 - Clean up everything:**
```bash
# Kill all processes
# Windows:
taskkill /F /IM python.exe && taskkill /F /IM node.exe

# macOS/Linux:
pkill -f python && pkill -f node

# Wait 2 seconds
sleep 2

# Verify processes are dead
# Windows: tasklist | findstr python
# macOS/Linux: ps aux | grep -E 'python|node'
```

**Terminal 2 - Fresh backend with clean database:**
```bash
cd backend

# Optional: Clear Python cache
rm -rf __pycache__ .pytest_cache .venv

# Reinstall if needed
pip install -r requirements.txt

# Reset database schema and seed fresh data
python -c "from shared.migrations import init_schema; init_schema()"
python -c "from shared.migrations import reset_and_seed; reset_and_seed()"

# Start fresh backend (auto-reload enabled)
uvicorn main:app --reload
# ✅ Backend at http://localhost:8000
```

**Database Reset Details:**
The `reset_and_seed()` function will:
- ✅ Clear existing tables (if any)
- ✅ Create all tables from schema
- ✅ Seed 3 test users (alice@, bob@, ops@)
- ✅ Seed 10+ products with stock & prices
- ✅ Seed 3 coupon codes (WELCOME10, SUMMER20, FREESHIP)
- ✅ Seed 5 sample customers
- ✅ Display progress with logging

**Terminal 3 - Fresh frontend:**
```bash
cd frontend

# Optional: Clear node cache
rm -rf node_modules .vite

# Reinstall if needed
npm install

# Start fresh frontend
npm run dev
# ✅ Frontend at http://localhost:5173
```

**Verify everything works:**
```bash
# In browser, visit:
# http://localhost:8000/docs (API documentation)
# http://localhost:5173 (frontend)
```

## Common Commands

### Backend
```bash
# Install dependencies
pip install -r requirements.txt

# Run dev server
uvicorn main:app --reload

# Run tests
pytest backend/uc1-browse-order/tests/

# View API docs
# Visit http://localhost:8000/docs
```

### Frontend
```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

### Database
```bash
# Connect to PostgreSQL
psql vibestrike

# Run migrations
psql vibestrike < database/schema.sql

# View schema
\dt  # list tables
\d products  # describe products table
```

### Process Management
```bash
# Windows: List running processes
tasklist | findstr python   # Show Python processes
tasklist | findstr node     # Show Node processes

# Windows: Kill specific ports
netstat -ano | findstr :8000   # Find what's on port 8000
taskkill /PID <PID> /F         # Kill process by ID

# macOS/Linux: Find port users
lsof -i :8000   # Find what's on port 8000
kill -9 <PID>   # Kill process by ID
```

## FAQ

**Q: Can I start without the others?**  
A: Yes! Mock your data first. UC1 can mock products, UC2 can mock coupons, etc. Frontend builds UI against mocks. When backend ready, integrate.

**Q: What if I need to change the API?**  
A: Discuss with team lead. Update `api-contracts/openapi-spec.yaml` FIRST, then all teams implement to it.

**Q: What if I need a new database table?**  
A: Don't add without consensus. Talk to team lead. If needed, update `database/schema.sql` and all teams re-run migrations.

**Q: How do I run the full system end-to-end?**  
A: 1) Start backend 2) Start frontend 3) Visit http://localhost:5173 4) Click through flows

**Q: Where's my code?**  
A: UC#: `backend/uc#-*/api/` (endpoints), `backend/uc#-*/services/` (logic), `frontend/src/pages/uc#-*/` (UI)

## Next Steps After Startup

1. ✅ You've run this skill
2. 📖 Read your UC's [backend/uc*/README.md](backend/)
3. 💻 Start with a mock endpoint (copy from example)
4. 🎨 Build frontend UI against mock
5. 🧪 Write tests for your endpoints
6. 🔗 Integrate with other UCs
7. 🎬 Demo your feature

## Navigation Guide

### Customer Header (User Type: Customer)
- **Logo (👒 CAPS)** → Home
- **Shop** → Browse products
- **🛒 Cart** → View cart items
- **👤 User Menu** → 
  - 👤 My Profile
  - 📦 Track Orders (UC4)
  - 🚪 Logout

### Ops Manager Header (User Type: Ops Manager)
- **Logo (👒 CAPS Operations)** → Home
- **📦 Inventory** → UC3 inventory dashboard
- **📊 Orders Queue** → UC3 ops dashboard with order queue
- **User Info** → email + "Ops Manager" label
- **Logout** button

## Skills to Know

- **`/code-review`** - Review a GitHub PR
- **`/security-review`** - Audit changes for security
- **`/run`** - Start the development servers
- **`/playwright-tdd`** - Test frontend in real browser

## Getting Help

- **Architecture questions:** See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
- **My UC deep dive:** Read `backend/uc#-*/README.md`
- **Database questions:** See `database/schema.sql` + [TECH_STACK.md](TECH_STACK.md)
- **API contract questions:** See `api-contracts/openapi-spec.yaml`

---

**Ready to code?** Pick your UC and dive into `backend/uc#-*/README.md`! 🚀
