# Vibe Strike - Quick Start Guide

## 🚀 Start Development (3 Steps)

### Step 1: Open Terminal 1 - Backend Server
```bash
cd c:\Capstone\capsotne\backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Expected:** Server running at http://localhost:8000

### Step 2: Open Terminal 2 - Frontend Dev Server
```bash
cd c:\Capstone\capsotne\frontend
npm run dev
```

**Expected:** Dev server running at http://localhost:5173

### Step 3: Open Browser Windows

| URL | Purpose |
|-----|---------|
| http://localhost:5173 | Frontend Application |
| http://localhost:8000/docs | Backend API Documentation (Swagger UI) |
| http://localhost:8000/health | Backend Health Check |

---

## ✅ Verification

### Backend Health Check
```bash
curl http://localhost:8000/health
```
Response: `{"status":"ok","version":"1.0.0"}`

### List Products
```bash
curl http://localhost:8000/products
```

### API Documentation
Open http://localhost:8000/docs in browser to test all endpoints interactively

---

## 📁 Project Structure

```
c:\Capstone\capsotne\
├── backend/              → Python FastAPI server (Port 8000)
│   ├── main.py          → Entry point
│   ├── api/             → UC1 endpoints (products, orders)
│   ├── uc2_promotions/  → UC2 endpoints (coupons)
│   ├── shared/          → Models, database, schemas
│   └── vibestrike.db    → SQLite database (auto-created)
│
├── frontend/            → React Vite app (Port 5173)
│   ├── src/
│   │   ├── App.jsx      → Main component
│   │   └── pages/       → UC1-4 pages
│   ├── dist/            → Production build
│   └── package.json
│
├── .env                 → Configuration
├── DEPLOYMENT_STATUS.md → Full deployment report
└── START_DEVELOPMENT.md → This file

```

---

## 🔧 Configuration

**File:** `c:\Capstone\capsotne\.env`

Current settings:
```
ENV=development
DEBUG=true
DATABASE_URL=sqlite:///./vibestrike.db
API_PORT=8000
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
LOG_LEVEL=INFO
```

To use PostgreSQL instead:
```
DATABASE_URL=postgresql://user:password@localhost:5432/vibestrike
```

---

## 📊 Database

**Type:** SQLite (Development)
**Location:** `backend/vibestrike.db` (auto-created)

### Tables
- `products` - Product catalog with stock
- `customers` - Customer records
- `orders` - Order records
- `order_items` - Line items
- `coupons` - Promotional codes

Database is automatically initialized on first server startup.

---

## 🧪 API Testing

### Via Swagger UI (Recommended)
1. Start backend server (see Step 1)
2. Open http://localhost:8000/docs
3. Click on endpoints to test
4. Click "Try it out" button

### Via cURL

**Get all products:**
```bash
curl http://localhost:8000/products
```

**Create a product:**
```bash
curl -X POST http://localhost:8000/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Headphones",
    "description": "High-quality sound",
    "price": 149.99,
    "stock": 50
  }'
```

**Create an order:**
```bash
curl -X POST http://localhost:8000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [
      {"product_id": 1, "quantity": 2}
    ]
  }'
```

---

## 🔗 Available Endpoints

### Products (UC1)
- `GET /products` - List all products
- `POST /products` - Create product
- `GET /products/{id}` - Get product
- `PATCH /products/{id}` - Update product
- `DELETE /products/{id}` - Delete product

### Orders (UC1)
- `POST /orders` - Create order (with atomic stock handling)
- `GET /orders/{id}` - Get order
- `GET /orders` - List orders
- `PATCH /orders/{id}` - Update order status

### Coupons (UC2)
- `GET /coupons` - List available coupons
- `POST /coupons/validate` - Validate coupon code
- `POST /coupons/apply` - Apply coupon to order

See http://localhost:8000/docs for full API documentation.

---

## 📦 Common Commands

### Backend
```bash
cd c:\Capstone\capsotne\backend

# Install dependencies (if needed)
pip install -r requirements.txt

# Start server (with auto-reload)
python -m uvicorn main:app --reload

# Start server (fixed port, no reload)
python -m uvicorn main:app --host 0.0.0.0 --port 8000

# Run tests
pytest -v

# Reset database (dev only)
rm vibestrike.db  # Then restart server
```

### Frontend
```bash
cd c:\Capstone\capsotne\frontend

# Install dependencies (if needed)
npm install

# Start dev server (hot reload)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Linting
npm run lint

# Fix vulnerabilities
npm audit fix
```

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check port is free
netstat -ano | findstr :8000

# Try different port
python -m uvicorn main:app --port 8001
```

### Frontend shows blank page
```bash
# Clear browser cache (Ctrl+Shift+Delete)
# Hard refresh (Ctrl+F5)
# Check console for errors (F12)
```

### Database errors
```bash
# Reset database (dev only)
cd backend
rm vibestrike.db
python -m uvicorn main:app --reload
```

### Port already in use
```bash
# Kill process on port 8000 (Windows)
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Change frontend port in vite.config.js
```

---

## 📚 Documentation

- **Full Status Report:** `DEPLOYMENT_STATUS.md`
- **Project Overview:** `CLAUDE.md`
- **Frontend Setup:** `frontend/SETUP_GUIDE.md`
- **Use Cases:** `backend/uc*/README.md`

---

## 🚦 Status

| Component | Status | Location |
|-----------|--------|----------|
| Backend | ✅ Ready | http://localhost:8000 |
| Frontend | ✅ Ready | http://localhost:5173 |
| Database | ✅ Initialized | `backend/vibestrike.db` |
| API Docs | ✅ Available | http://localhost:8000/docs |

---

## 💡 Tips

1. **Use Swagger UI** for interactive API testing
2. **Keep terminal windows open** to monitor logs
3. **Check browser console** (F12) for frontend errors
4. **Use `--reload` flag** during development for auto-restart
5. **Database auto-initializes** on first server startup
6. **Frontend hot-reloads** automatically on file changes

---

## ✨ Next Steps

1. Start both servers (see Step 1 & 2)
2. Explore API docs at http://localhost:8000/docs
3. View frontend at http://localhost:5173
4. Create test data via Swagger UI
5. Test order flow end-to-end
6. Review UC documentation for feature details

---

**Ready to develop?** Start with Step 1 above!
