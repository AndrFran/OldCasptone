# Ops Manager Dashboard - Setup Guide

Quick start for the Vibe Strike Operations Dashboard.

## Prerequisites

- Node.js 16+ and npm
- Backend running on `http://localhost:8000`
- PostgreSQL database with schema initialized

## Installation

```bash
cd frontend
npm install
```

This installs:
- React 18.2
- React Router 6
- Axios for HTTP
- Vite for bundling
- Tailwind CSS for styling

## Running the Dashboard

### Development Server
```bash
npm run dev
```

Dashboard runs on: **http://localhost:5173**

### Production Build
```bash
npm run build
npm run preview
```

## Project Structure

### Authentication
- **File:** `src/pages/LoginPage.jsx`
- Demo credentials accepted: any email with @ and password 6+ chars
- User session stored in localStorage

### Inventory Management
- **Pages:** `src/pages/InventoryPage.jsx`
- **Components:**
  - `InventoryOverview.jsx` - Product table with stock levels
  - `LowStockAlerts.jsx` - Alerts by urgency (CRITICAL/WARNING)
  - `RestockForm.jsx` - Add inventory to products
- **Hook:** `src/hooks/useInventory.js`
- **Auto-refresh:** Every 30 seconds

### Order Management
- **Pages:** `src/pages/OrdersPage.jsx`, `src/pages/OrderDetailPage.jsx`
- **Components:**
  - `OrderQueue.jsx` - List of orders with status badges
  - `OrderStatusFilter.jsx` - Filter by status
  - `OrderDetail.jsx` - Full order view with status updates
- **Hook:** `src/hooks/useOrders.js`
- **Auto-refresh:** Every 30 seconds

## API Endpoints Required

The backend must provide these endpoints:

### Inventory
```
GET    /inventory                 - List all products
GET    /inventory/low-stock       - Get low-stock alerts
PATCH  /inventory/{product_id}    - Restock product
```

### Orders
```
GET    /orders                    - List all orders
GET    /orders/{order_id}         - Get order details
PATCH  /orders/{order_id}/status  - Update order status
GET    /customers/{customer_id}/orders  - Customer order history
```

## File Structure

```
frontend/
├── src/
│   ├── pages/              # Full page components
│   │   ├── LoginPage.jsx
│   │   ├── DashboardLayout.jsx
│   │   ├── InventoryPage.jsx
│   │   ├── OrdersPage.jsx
│   │   └── OrderDetailPage.jsx
│   ├── components/         # Reusable components
│   │   ├── InventoryOverview.jsx
│   │   ├── LowStockAlerts.jsx
│   │   ├── RestockForm.jsx
│   │   ├── OrderQueue.jsx
│   │   ├── OrderStatusFilter.jsx
│   │   └── OrderDetail.jsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useInventory.js
│   │   └── useOrders.js
│   ├── api/                # API client
│   │   ├── client.js
│   │   ├── inventory.js
│   │   └── orders.js
│   ├── App.jsx             # Main router
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles
├── package.json
├── vite.config.js
└── OPS_DASHBOARD_README.md # Full documentation
```

## Login & Navigation

### Login Page
- Email: any value with @
- Password: any value 6+ characters
- Demo: `ops@example.com` / `demo1234`

### Dashboard Navigation
- **Sidebar:** Quick navigation to Inventory and Orders
- **User Info:** Shows logged-in user and email
- **Logout:** Clear session and return to login

## Features

### Inventory Overview
- Table of all products with:
  - Current stock vs threshold
  - Stock status (OK/LOW/CRITICAL)
  - Inventory value calculation
- Real-time updates every 30 seconds
- Manual refresh button

### Low-Stock Alerts
- Separated by urgency:
  - CRITICAL: Red (stock ≤ threshold/5)
  - WARNING: Orange (stock < threshold)
- Quick "Restock" button for each alert

### Restock Form
- Select product from dropdown
- Enter quantity to add
- Preview new stock level
- Success/error notifications

### Order Queue
- Live list of all orders
- Color-coded status badges:
  - Orange: Pending
  - Blue: Confirmed
  - Purple: Shipped
  - Green: Delivered
- Shows order total, discount, item count
- Click any order to view details

### Order Status Filter
- Filter by status with counts
- "All Orders" shows all

### Order Detail View
- Complete order information
- Order items table
- Status transition buttons
- One-click status updates

## Real-Time Behavior

- **Auto-refresh:** Inventory and orders refresh every 30 seconds
- **Loading states:** All async operations show loading indicators
- **Error handling:** API errors displayed as red alerts
- **Success notifications:** Restock operations show success message
- **Form validation:** Client-side validation with error messages

## Styling

- **Color scheme:** Blue primary, dark sidebar, status-specific colors
- **Responsive design:** Works on desktop, tablet, and mobile
- **Accessibility:** Proper ARIA labels, keyboard navigation
- **Consistent spacing:** 10px grid for margins/padding

## Configuration

### API URL
By default: `http://localhost:8000`

To change, set environment variable:
```bash
VITE_API_URL=http://your-backend.com npm run dev
```

### Auto-Refresh Interval
Change in hooks (default 30s):
```javascript
const { inventory } = useInventory(60000) // 60 seconds
```

## Troubleshooting

### Login not working
- Check email format (must have @)
- Check password length (6+ characters)
- Clear localStorage: `localStorage.clear()` in console

### API errors
- Ensure backend is running on http://localhost:8000
- Check CORS headers in backend
- Check network tab in DevTools for 404s

### Styling broken
- Clear browser cache (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac)
- Run `npm install` again to ensure Tailwind is installed

### Components not updating
- Check auto-refresh is enabled (look for 30s timer)
- Click "Refresh" button manually
- Check browser console for API errors

## Development Notes

- Written with React Hooks (no class components)
- Uses React Router v6 for navigation
- Axios for HTTP with error interceptors
- Custom hooks for data management
- CSS modules for scoped styling
- Responsive design with CSS Grid/Flexbox

## Performance

- Auto-refresh every 30 seconds (adjustable)
- Request debouncing in API client
- Lazy loading page components
- Efficient re-rendering with React hooks
- Ready for pagination (API supports `skip`/`limit`)

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile: iOS Safari, Chrome Mobile

## Next Steps

1. Start backend: `python -m uvicorn main:app --reload`
2. Start frontend: `npm run dev`
3. Visit http://localhost:5173
4. Login with any email/password 6+
5. Start managing inventory and orders!
