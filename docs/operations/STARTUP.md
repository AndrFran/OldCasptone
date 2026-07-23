# Vibe Strike - Quick Start Guide

## Prerequisites
- Python 3.14+
- Node.js 18+

## Setup (One-time)

### 1. Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Frontend Dependencies
```bash
cd frontend
npm install
```

## Running the Application

### Start Backend (Terminal 1)
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

The backend will automatically:
- Create the SQLite database (`vibestrike.db`)
- Initialize all tables
- Seed demo data (products, users, coupons)

**Backend Ready:** http://localhost:8000

### Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

**Frontend Ready:** http://localhost:5173

---

## Demo Credentials

| Email | Password | Role |
|-------|----------|------|
| alice@example.com | password123 | Customer |
| bob@example.com | password123 | Customer |
| ops@example.com | password123 | Ops Manager |

---

## API Documentation

Access OpenAPI Swagger UI at: **http://localhost:8000/docs**

---

## Database

- **File:** `vibestrike.db` (SQLite)
- **Location:** Root project directory
- **Auto-seeded with:**
  - 16 trucker cap products
  - 3 users (2 customers + 1 ops manager)
  - 4 coupons (WELCOME10, SAVE5, SUMMER20, EXPIRED)

---

## Features

### Customer Flow
1. Login at http://localhost:5173
2. Browse trucker cap products
3. View stock levels
4. Add items to cart
5. Apply coupon codes
6. Place order

### Ops Manager Flow
1. Login as ops@example.com
2. Access dashboard with:
   - Inventory levels & low-stock alerts
   - Orders queue
   - Order status updates

---

## Troubleshooting

**Backend won't start:**
```bash
# Verify Python 3.14+
python --version

# Check port 8000 not in use
lsof -i :8000
```

**Frontend build fails:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Database issue:**
```bash
# Delete and recreate (will reseed on next backend start)
rm vibestrike.db
```

---

**First time?** Read [START_HERE.md](START_HERE.md) for full project overview.
