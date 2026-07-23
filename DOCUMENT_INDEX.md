# Document Index: Quick Navigation

## 🚀 Getting Started (Read in Order)

1. **[START_HERE.md](START_HERE.md)** ← **Start here if you're new**
   - Project overview
   - What are the 4 use cases?
   - Development timeline
   - Getting started in 3 steps

2. **[CLAUDE.md](CLAUDE.md)** — Team roles & tech stack
   - 4 UC teams and their responsibilities
   - FastAPI, PostgreSQL, React setup

3. **[README.md](README.md)** — Project overview & quick setup
   - Quick start commands
   - Project structure
   - Demo checklist

---

## 📋 Parallel Development (Everyone)

- **[PARALLEL_DEVELOPMENT.md](PARALLEL_DEVELOPMENT.md)** — How 4 teams work independently
  - Project structure for parallel work
  - Shared contracts & database
  - Mock-first approach
  - Integration workflow

- **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** — How UCs integrate
  - UC1 + UC2: Coupon at checkout
  - UC1 + UC3: Stock decrement
  - UC3 + UC4: Ops dashboard
  - UC1 + UC4: Order tracking
  - E2E customer journey
  - Troubleshooting

---

## 🏗️ Implementation Specs (UC Teams)

- **[backend/uc1-browse-order/README.md](backend/uc1-browse-order/README.md)** — UC1 spec
  - Browse products, place order with atomic stock check
  
- **[backend/uc2-promotions/README.md](backend/uc2-promotions/README.md)** — UC2 spec
  - Coupon validation, discount auto-application

- **[backend/uc3-inventory/README.md](backend/uc3-inventory/README.md)** — UC3 spec
  - Inventory levels, low-stock alerts, restock

- **[backend/uc4-order-tracking/README.md](backend/uc4-order-tracking/README.md)** — UC4 spec
  - Order status tracking, order history

---

## 📚 Detailed Docs

- **[UI_STYLE_GUIDE.md](UI_STYLE_GUIDE.md)** — Frontend design system (NEW)
  - React + Tailwind CSS + shadcn/ui decision
  - Color palette & typography
  - Component structure & standards
  - Folder structure & best practices
  - Performance metrics

- **[TECH_STACK.md](TECH_STACK.md)** — Detailed tech decisions
  - FastAPI setup, PostgreSQL queries
  - React + Tailwind + shadcn/ui
  - API client code
  - 4-hour timeline
  - Demo checklist

- **[PROJECT_ANALYSIS.md](PROJECT_ANALYSIS.md)** — Problem analysis
  - Core challenges identified
  - Subagent decomposition
  - Technical decisions

- **[PROJECT_SETUP_COMPLETE.md](PROJECT_SETUP_COMPLETE.md)** — What's been built
  - Complete scaffolding summary
  - Files ready to implement
  - Development phases
  - Shared rules

---

## 🔗 Shared Resources (Read-Only)

- **[api-contracts/openapi-spec.yaml](api-contracts/openapi-spec.yaml)** — API specification
  - All endpoints defined
  - Request/response schemas
  - Error codes

- **[database/schema.sql](database/schema.sql)** — Database schema
  - All tables (products, orders, coupons, customers)
  - Indexes for performance
  - Sample seed data

- **[backend/shared/models.py](backend/shared/models.py)** — ORM models
  - Product, Order, Coupon, Customer classes
  - Relationships & validation

- **[backend/shared/db.py](backend/shared/db.py)** — Database layer
  - Connection management
  - Session handling

---

## 📑 File Organization

```
capsotne/
├── START_HERE.md                    ← Read this first
├── CLAUDE.md                        ← Team roles, tech stack
├── README.md                        ← Quick start
├── UI_STYLE_GUIDE.md                ← Frontend design system (NEW)
├── PARALLEL_DEVELOPMENT.md          ← How teams coordinate
├── INTEGRATION_GUIDE.md             ← How UCs integrate
├── TECH_STACK.md                    ← Tech details
├── PROJECT_ANALYSIS.md              ← Problem analysis
├── PROJECT_SETUP_COMPLETE.md        ← What's been built
├── DOCUMENT_INDEX.md                ← You are here
│
├── api-contracts/
│   └── openapi-spec.yaml            ← API spec (shared)
│
├── database/
│   └── schema.sql                   ← DB schema (shared)
│
├── backend/
│   ├── main.py                      ← FastAPI entry point
│   ├── config.py                    ← Configuration
│   ├── requirements.txt             ← Dependencies
│   ├── shared/
│   │   ├── models.py                ← ORM models (shared)
│   │   └── db.py                    ← Database layer (shared)
│   ├── uc1-browse-order/
│   │   ├── README.md                ← UC1 spec
│   │   ├── api/                     ← Endpoints
│   │   ├── services/                ← Business logic
│   │   └── tests/                   ← Unit tests
│   ├── uc2-promotions/              ← UC2 structure
│   ├── uc3-inventory/               ← UC3 structure
│   └── uc4-order-tracking/          ← UC4 structure
│
├── frontend/
│   ├── package.json                 ← React dependencies
│   ├── vite.config.js               ← Vite config
│   └── src/
│       ├── pages/
│       │   ├── uc1-products/        ← Product pages
│       │   ├── uc1-checkout/        ← Checkout
│       │   ├── uc2-promotions/      ← Coupon input
│       │   ├── uc3-inventory/       ← Ops dashboard
│       │   └── uc4-tracking/        ← Order tracking
│       ├── hooks/                   ← React hooks per UC
│       └── api/                     ← API clients per UC
│
└── tests/
    ├── integration/                 ← Cross-UC tests
    └── concurrent/                  ← Stress tests
```

---

## 🎯 By Role

### New Team Member
1. Read: [START_HERE.md](START_HERE.md)
2. Read: [CLAUDE.md](CLAUDE.md)
3. Read: Your UC's [backend/uc*/README.md](backend/)
4. Setup: Follow [README.md](README.md) Quick Start

### Backend Engineer
1. Read: Your UC's [backend/uc*/README.md](backend/)
2. Review: [api-contracts/openapi-spec.yaml](api-contracts/openapi-spec.yaml)
3. Review: [database/schema.sql](database/schema.sql)
4. Reference: [backend/shared/models.py](backend/shared/models.py)
5. Coordinate: Check [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for cross-UC points

### Frontend Engineer
1. Read: Your UC's [backend/uc*/README.md](backend/)
2. Review: [api-contracts/openapi-spec.yaml](api-contracts/openapi-spec.yaml)
3. **Study: [UI_STYLE_GUIDE.md](UI_STYLE_GUIDE.md)** for design system
4. Reference: [TECH_STACK.md](TECH_STACK.md) for UI components

### Integration Tester
1. Read: [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
2. Review: [PARALLEL_DEVELOPMENT.md](PARALLEL_DEVELOPMENT.md)
3. Run: Tests in [tests/integration/](tests/integration/)
4. Check: Demo checklist in [README.md](README.md)

### Architecture Lead
1. Read: [PARALLEL_DEVELOPMENT.md](PARALLEL_DEVELOPMENT.md)
2. Review: [api-contracts/openapi-spec.yaml](api-contracts/openapi-spec.yaml)
3. Review: [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
4. Verify: [PROJECT_SETUP_COMPLETE.md](PROJECT_SETUP_COMPLETE.md)

---

## 🔍 Find Information By Topic

### How to...

| Topic | File |
|-------|------|
| Get started | [START_HERE.md](START_HERE.md) |
| Set up environment | [README.md](README.md#quick-start) |
| **UI design system** | **[UI_STYLE_GUIDE.md](UI_STYLE_GUIDE.md)** |
| Understand parallel dev | [PARALLEL_DEVELOPMENT.md](PARALLEL_DEVELOPMENT.md) |
| See integration points | [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) |
| Write UC1 backend | [backend/uc1-browse-order/README.md](backend/uc1-browse-order/README.md) |
| Write UC2 backend | [backend/uc2-promotions/README.md](backend/uc2-promotions/README.md) |
| Write UC3 backend | [backend/uc3-inventory/README.md](backend/uc3-inventory/README.md) |
| Write UC4 backend | [backend/uc4-order-tracking/README.md](backend/uc4-order-tracking/README.md) |
| Find API spec | [api-contracts/openapi-spec.yaml](api-contracts/openapi-spec.yaml) |
| Find DB schema | [database/schema.sql](database/schema.sql) |
| Understand race conditions | [TECH_STACK.md](TECH_STACK.md#race-condition-handling) |
| Troubleshoot | [README.md](README.md#troubleshooting) |

---

**Last Updated:** 2026-07-23  
**Status:** Ready for development
