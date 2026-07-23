# Technology Stack & Implementation Guide

## Backend: FastAPI + PostgreSQL

### Why FastAPI?
- ✅ **Auto OpenAPI spec** — generates `openapi.json` + Swagger UI at `/docs` (zero extra work)
- ✅ **Async/await** — handles concurrent requests efficiently
- ✅ **Built-in validation** — Pydantic models validate request/response data
- ✅ **Speed** — Write ~200 lines of code, get production-ready API

### Race Condition Solution: Atomic UPDATE Query

**Problem:** Two customers buy the last unit simultaneously.

**Solution:** Single atomic SQL query:
```sql
UPDATE products 
SET stock = stock - :qty 
WHERE id = :product_id AND stock >= :qty;
```

**Logic:**
- If `stock >= qty`, decrement and return 1 row affected
- If `stock < qty`, return 0 rows affected
- Only one transaction commits the decrement atomically
- Second request sees 0 rows affected → return 400 Out of Stock

**Time to implement:** 5 minutes

### Database Setup
```python
# Core tables
- products (id, name, price, stock, low_stock_threshold)
- orders (id, customer_id, status, total, created_at)
- order_items (id, order_id, product_id, quantity, price)
- coupons (code, discount_type, value, expires_at, max_uses, used_count)
- customers (id, email, name)
```

### FastAPI Endpoints (Auto-documented)

All endpoints return OpenAPI-compliant schemas. Swagger UI available at `/docs`.

**Products:**
- `GET /products` → list all
- `GET /products/{id}` → detail

**Orders:**
- `POST /orders` → place order (atomic stock check)
- `GET /orders/{id}` → status
- `GET /customers/{cust_id}/orders` → history
- `PATCH /orders/{id}/status` → update (ops only)

**Inventory (ops):**
- `GET /inventory` → all levels
- `PATCH /inventory/{product_id}` → restock
- `GET /inventory/low-stock` → alerts

**Promotions:**
- `POST /coupons/validate` → check validity
- `GET /promotions` → active list

---

## Frontend: React (Vite) + Tailwind + shadcn/ui

### Why This Stack?
- ✅ **Vite** — instant dev server, < 1s page reloads
- ✅ **Tailwind CSS** — utility-first, no custom CSS needed
- ✅ **shadcn/ui** — copy-paste component library (Button, Input, Card, Dialog, Table, etc.)
- ✅ **Production-ready appearance** — components styled for client acceptance out of box

### Directory Structure
```
src/
├── pages/
│   ├── customer/
│   │   ├── Products.jsx       (listing + search)
│   │   ├── ProductDetail.jsx  (detail + add to cart)
│   │   ├── Cart.jsx           (items + coupon field)
│   │   ├── Checkout.jsx       (order confirm)
│   │   └── OrderTracking.jsx  (order ID → status)
│   ├── ops/
│   │   ├── Dashboard.jsx      (overview, alerts)
│   │   ├── Inventory.jsx      (table + restock form)
│   │   ├── Orders.jsx         (queue + detail)
│   │   └── OrderDetail.jsx    (customer info + status update)
│   └── Auth.jsx               (ops login)
├── components/
│   ├── ui/                    (shadcn components: Button, Input, Card, Dialog, Table, etc.)
│   ├── ProductCard.jsx
│   ├── CartItem.jsx
│   └── OrderCard.jsx
├── hooks/
│   ├── useProducts.js         (fetch products)
│   ├── useOrders.js           (fetch/create orders)
│   ├── useInventory.js        (fetch inventory)
│   └── useCart.js             (local state management)
├── api.js                     (Axios instance, baseURL to FastAPI)
└── App.jsx
```

### Key Components

**Products Page:**
- Display products with stock status (green = in stock, red = out)
- Search/filter by name, price range
- Add to cart button

**Cart Page:**
- List items with quantity controls
- Subtotal calculator
- **Coupon input field** with validate button
- Apply coupon → display discount + new total
- Place order button

**Order Tracking Page:**
- Input field for order ID
- Display order status (pending → shipped → delivered)
- Show items, total, applied discount
- Real-time status refresh (poll API every 5s or use WebSocket)

**Ops Dashboard:**
- **Inventory Alert Banner:** Products below threshold (red highlight)
- **Inventory Table:** Product name, current stock, threshold, restock button
- **Order Queue:** Live table of orders sorted by status
- **Order Detail Modal:** Click order → see customer info, items, status dropdown
- Status update → POST to API → close modal → refresh queue

### shadcn/ui Components to Use
```
Button, Input, Card, Table, Dialog, Select, Badge, 
Alert, Tabs, Form, Popover, Toast
```

All come pre-styled with Tailwind. Copy from https://ui.shadcn.com/.

---

## API Client (Frontend → Backend)

```javascript
// api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
});

export const products = {
  getAll: () => api.get('/products'),
  getById: (id) => api.get(`/products/${id}`),
};

export const orders = {
  create: (orderData) => api.post('/orders', orderData),
  getById: (id) => api.get(`/orders/${id}`),
  getByCustomer: (custId) => api.get(`/customers/${custId}/orders`),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
};

export const coupons = {
  validate: (code) => api.post('/coupons/validate', { code }),
};

export const inventory = {
  getAll: () => api.get('/inventory'),
  getLowStock: () => api.get('/inventory/low-stock'),
  restock: (productId, qty) => api.patch(`/inventory/${productId}`, { qty }),
};
```

---

## Development Timeline (4 hours)

| Time | Task | Owner |
|------|------|-------|
| 0:00–0:30 | Architecture + database schema | Architecture Designer |
| 0:30–1:30 | FastAPI backend (3 services parallel) | Backend Engineers |
| 1:30–2:30 | React frontend UI (2 frontends parallel) | Frontend Engineers |
| 2:30–3:30 | Integration + E2E testing | Integration Tester |
| 3:30–4:00 | Polish + demo prep | All |

---

## Demo Checklist

- [ ] Customer browses products (stock visible)
- [ ] Add item to cart, apply coupon, place order
- [ ] Order appears in ops queue
- [ ] Ops updates status → customer sees tracking update
- [ ] Two simultaneous orders for last unit → only one succeeds
- [ ] Low-stock alert triggers for item below threshold
- [ ] OpenAPI spec accessible at `/docs` with all endpoints documented
- [ ] UI looks polished (no broken styles, responsive on mobile)
- [ ] No mid-demo bugs

