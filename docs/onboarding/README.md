# Vibe Strike: Order & Inventory Engine

Real-time e-commerce backend for a mid-size retailer, built by 4 independent teams developing in parallel.

**Demo Duration:** 4 hours  
**Tech Stack:** FastAPI (Python) + PostgreSQL + React (Vite) + Tailwind CSS

> **New to this project?** Start with [START_HERE.md](START_HERE.md) for a complete onboarding guide.

---

## Quick Start

### 1. Setup Database

```bash
# Install PostgreSQL (or use Supabase/Neon/Render)
# Create database
createdb vibestrike

# Initialize schema
psql vibestrike < database/schema.sql
```

### 2. Setup Backend

```bash
cd backend
cp ../.env.example .env
pip install -r requirements.txt
uvicorn main:app --reload
```

**API Available at:** `http://localhost:8000`  
**Swagger Docs:** `http://localhost:8000/docs`

### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

**Frontend Available at:** `http://localhost:5173`

---

## Project Structure

```
capsotne/
├── CLAUDE.md                      # Team roles, tech stack, UC overview
├── PARALLEL_DEVELOPMENT.md        # How 4 teams work independently
├── INTEGRATION_GUIDE.md           # How UC integrations work
├── TECH_STACK.md                  # Detailed tech decisions
│
├── api-contracts/                 # Shared API spec (READ-ONLY)
│   └── openapi-spec.yaml
│
├── database/                      # Shared database schema
│   ├── schema.sql
│   └── migrations/
│
├── backend/
│   ├── main.py                    # FastAPI entry point
│   ├── config.py                  # Configuration
│   ├── requirements.txt
│   ├── shared/                    # Shared: models, DB, exceptions
│   ├── uc1-browse-order/          # UC1: Products & Orders
│   ├── uc2-promotions/            # UC2: Coupons & Discounts
│   ├── uc3-inventory/             # UC3: Inventory & Alerts
│   └── uc4-order-tracking/        # UC4: Order Tracking
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── pages/uc1-products/    # UC1: Product pages, cart, checkout
│       ├── pages/uc2-promotions/  # UC2: Coupon input
│       ├── pages/uc3-inventory/   # UC3: Ops dashboard
│       ├── pages/uc4-tracking/    # UC4: Order tracking
│       ├── hooks/                 # Custom React hooks per UC
│       └── api/                   # API clients per UC
│
└── tests/
    ├── integration/               # Cross-UC integration tests
    └── concurrent/                # Stress tests
```

---

## Use Cases

| UC | Name | Team | Key Feature |
|---|------|------|-------------|
| **UC1** | Browse Products & Place Order | Backend + Frontend | Atomic stock update (race condition safe) |
| **UC2** | Discounts & Coupon Codes | Backend + Frontend | Auto-apply coupons at checkout |
| **UC3** | Inventory Management & Alerts | Backend + Frontend (Ops) | Real-time low-stock alerts |
| **UC4** | Order Status Tracking | Backend + Frontend | Order tracking & ops queue |

**See detailed specs:** Each UC has its own [backend/uc*/README.md](backend/)

---

## Demo Checklist

- [ ] Customer browses products (stock visible)
- [ ] Add item to cart, apply coupon, see discount applied
- [ ] Place order → receives order ID
- [ ] Order appears in ops manager queue
- [ ] Ops manager sees low-stock alerts
- [ ] Ops manager updates order status → customer sees it tracked
- [ ] Two concurrent orders for last unit → only 1 succeeds, 1 gets error
- [ ] OpenAPI spec at `/docs` shows all endpoints
- [ ] No mid-demo bugs, smooth operation

---

## Key Technical Decisions

### Race Condition Prevention
**Problem:** Two customers buy the last unit simultaneously

**Solution:** Atomic SQL UPDATE with stock check
```sql
UPDATE products SET stock = stock - :qty 
WHERE id = :product_id AND stock >= :qty
```

If rowcount == 0 → 400 "Out of Stock"  
If rowcount == 1 → order succeeds

### Parallel Development Strategy
- **Shared API Contracts** — All teams follow `api-contracts/openapi-spec.yaml`
- **Shared Database Schema** — All teams use `database/schema.sql`
- **Shared ORM Models** — Import from `backend/shared/models.py`
- **Mock-First Approach** — Frontend develops with hardcoded data while backend implements

---

## Testing

```bash
# Unit tests per UC
pytest backend/uc1-browse-order/tests/
pytest backend/uc2-promotions/tests/
pytest backend/uc3-inventory/tests/
pytest backend/uc4-order-tracking/tests/

# Integration tests (cross-UC flows)
pytest tests/integration/

# Race condition test
pytest tests/integration/test_race_condition.py
```

---

## Documentation

- **[CLAUDE.md](CLAUDE.md)** — Team roles, tech stack, UC overview
- **[PARALLEL_DEVELOPMENT.md](PARALLEL_DEVELOPMENT.md)** — How 4 teams work independently with shared contracts
- **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** — How UC integrations work together
- **[TECH_STACK.md](TECH_STACK.md)** — Detailed tech decisions, 4-hour timeline, demo checklist
- **[api-contracts/openapi-spec.yaml](api-contracts/openapi-spec.yaml)** — Complete API specification
- **[backend/uc*/README.md](backend/)** — Each UC's specific deliverables

---

## Troubleshooting

**Database Connection Failed:**
```bash
psql -U postgres -d vibestrike < database/schema.sql
```

**Stock Not Decrementing on Order:**
- Check `backend/uc1-browse-order/services/order_service.py` includes atomic UPDATE
- Verify WHERE clause: `WHERE id = :id AND stock >= :qty`

**Coupon Validation Returns 400:**
- Check coupons exist: `SELECT * FROM coupons;`
- Verify expiry date hasn't passed

**CORS Errors:**
- Check `backend/config.py` includes frontend URL in CORS_ORIGINS

---

Powered by **Claude Code** 🚀
