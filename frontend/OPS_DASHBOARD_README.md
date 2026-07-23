# Vibe Strike Ops Manager Dashboard

Complete real-time operations management interface for the Vibe Strike Order & Inventory Engine.

## Features

### 1. Authentication (Simple Email/Password)
- **File:** `src/pages/LoginPage.jsx`
- Login with email and password
- User session persisted in localStorage
- Simple credential validation (frontend-only for demo)
- Auto-logout on 401 response from API

### 2. Inventory Management

#### Inventory Overview
- **File:** `src/components/InventoryOverview.jsx`
- Table view of all products with:
  - Product ID, Name, Price
  - Current Stock vs Low Stock Threshold
  - Stock Status badges (OK / LOW / CRITICAL)
  - Inventory Value calculation
  - Real-time updates via auto-refresh (30s interval)

#### Low-Stock Alerts
- **File:** `src/components/LowStockAlerts.jsx`
- Categorized by urgency:
  - **CRITICAL:** Stock ≤ threshold / 5 (highlighted in red)
  - **WARNING:** Stock < threshold (highlighted in orange)
- Quick-restock buttons for each alert
- Empty state when all items are well-stocked

#### Restock Form
- **File:** `src/components/RestockForm.jsx`
- Dropdown to select product
- Display current stock and threshold
- Input field for quantity to add
- Preview of new stock level
- Submit button with loading state
- Success/error notifications

### 3. Order Management

#### Order Queue
- **File:** `src/components/OrderQueue.jsx`
- Live list of all orders
- Order cards showing:
  - Order ID, Customer ID
  - Status badge (color-coded)
  - Total amount and discount (if applicable)
  - Number of items
  - Creation timestamp
- Clickable to view full details
- Real-time updates via auto-refresh (30s interval)

#### Order Status Filter
- **File:** `src/components/OrderStatusFilter.jsx`
- Filter buttons for each status:
  - Pending (orange)
  - Confirmed (blue)
  - Shipped (purple)
  - Delivered (green)
- Shows count of orders per status
- Active filter highlighting

#### Order Detail View
- **File:** `src/components/OrderDetail.jsx`
- Complete order information:
  - Order ID, Customer ID
  - Current status with badge
  - Subtotal, Discount, Total
  - Coupon code (if applied)
  - Creation and last updated timestamps
- Order items table with:
  - Product ID, Quantity
  - Price per unit, Line item subtotal
- Status transition controls:
  - pending → confirmed or cancelled
  - confirmed → shipped or cancelled
  - shipped → delivered
  - delivered → no further updates
- One-click status updates with loading state

## Project Structure

```
frontend/src/
├── pages/
│   ├── LoginPage.jsx           # Authentication page
│   ├── DashboardLayout.jsx      # Main layout with sidebar
│   ├── InventoryPage.jsx        # Inventory management
│   ├── OrdersPage.jsx           # Order queue and filtering
│   └── OrderDetailPage.jsx      # Order details view
├── components/
│   ├── InventoryOverview.jsx    # Product table
│   ├── LowStockAlerts.jsx       # Alert cards
│   ├── RestockForm.jsx          # Restock input
│   ├── OrderQueue.jsx           # Order cards
│   ├── OrderStatusFilter.jsx    # Status filters
│   └── OrderDetail.jsx          # Order detail display
├── hooks/
│   ├── useInventory.js          # Inventory data & mutations
│   └── useOrders.js             # Orders data & mutations
├── api/
│   ├── client.js                # Axios instance with interceptors
│   ├── inventory.js             # Inventory API calls
│   └── orders.js                # Orders API calls
├── App.jsx                      # Main router setup
└── index.css                    # Base Tailwind styles
```

## API Integration

### Inventory API (`src/api/inventory.js`)

```javascript
// Get all products
inventoryAPI.getAll() → { items: [InventoryItem], total: number }

// Get low-stock alerts
inventoryAPI.getLowStock() → { items: [LowStockAlert], total: number }

// Restock a product
inventoryAPI.restock(productId, quantity) → { product_id, product_name, stock, updated_at }
```

**Expected Backend Endpoints:**
- `GET /inventory` - List all products
- `GET /inventory/low-stock` - Get low-stock alerts
- `PATCH /inventory/{product_id}` - Restock product

### Orders API (`src/api/orders.js`)

```javascript
// Get all orders
ordersAPI.getAll(params) → { items: [Order], total: number }

// Get single order
ordersAPI.getById(orderId) → Order

// Update order status
ordersAPI.updateStatus(orderId, newStatus) → Order

// Get customer orders
ordersAPI.getCustomerOrders(customerId, params) → { items: [Order], total: number }

// Get recommendations
ordersAPI.getRecommendations(orderId) → { recommendations: [Product] }
```

**Expected Backend Endpoints:**
- `GET /orders` - List all orders
- `GET /orders/{order_id}` - Get single order
- `PATCH /orders/{order_id}/status` - Update status
- `GET /customers/{customer_id}/orders` - Get customer orders
- `GET /orders/{order_id}/recommendations` - Get AI recommendations

## Data Models

### InventoryItem
```typescript
{
  product_id: number
  product_name: string
  stock: number
  price: decimal
  low_stock_threshold: number
  updated_at: datetime
}
```

### LowStockAlert
```typescript
{
  product_id: number
  product_name: string
  stock: number
  low_stock_threshold: number
  urgency: "CRITICAL" | "WARNING"
}
```

### Order
```typescript
{
  id: number
  customer_id: number
  status: "pending" | "confirmed" | "shipped" | "delivered"
  items: [OrderItem]
  subtotal: decimal
  discount_amount: decimal
  total: decimal
  coupon_code?: string
  created_at: datetime
  updated_at: datetime
}
```

### OrderItem
```typescript
{
  id: number
  order_id: number
  product_id: number
  quantity: number
  price: decimal
  subtotal: decimal
  created_at: datetime
}
```

## Real-Time Features

### Auto-Refresh
- **Inventory:** Refreshes every 30 seconds
- **Orders:** Refreshes every 30 seconds
- Manual refresh button on each page
- Configurable via hook parameters

### Loading States
- All async operations show loading indicators
- Buttons disabled during submission
- Loading spinners in data tables

### Error Handling
- API errors displayed as alerts
- Axios interceptor handles 401 (auto-logout)
- Network errors caught and displayed
- Form validation with error messages

## Styling

### Design System
- **Colors:**
  - Primary: `#0066cc` (blue)
  - Background: `#f5f5f5` (light gray)
  - Sidebar: `#1a1a2e` (dark blue)
  - Critical: `#c62828` (red)
  - Warning: `#e65100` (orange)
  - Success: `#4caf50` (green)

- **Spacing:** 10px increments (10px, 20px, 30px, etc.)
- **Border Radius:** 4-8px for cards, 6px for inputs
- **Font:** System fonts with fallback to sans-serif
- **Responsive:** Mobile-first with breakpoints at 768px

### CSS Modules Structure
Each component has its own `.css` file with BEM-like naming:
- `.component-name` - Main container
- `.component-name__element` - Child elements
- `.component-name--modifier` - Variants
- `.active`, `.error`, `.loading` - State classes

## Development

### Setup
```bash
cd frontend
npm install
npm run dev  # Starts on port 5173
```

### Build
```bash
npm run build    # Production build
npm run preview  # Preview production build
```

### Environment Variables
Create `.env.local`:
```
VITE_API_URL=http://localhost:8000
```

### API Proxy
The Vite config proxies `/api` requests to `http://localhost:8000`:
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, '')
  }
}
```

## Authentication Flow

1. User visits `/login`
2. Enters email and password
3. Frontend validates format
4. Stores user data in localStorage
5. On app load, checks localStorage
6. If user exists, redirects to dashboard
7. If 401 error from API, clears localStorage and redirects to login

## State Management

### useInventory Hook
```javascript
const { inventory, lowStockAlerts, loading, error, restock, refetch } = useInventory(refreshInterval)

// inventory: array of InventoryItem
// lowStockAlerts: array of LowStockAlert
// loading: boolean
// error: null | string
// restock(productId, quantity): Promise<boolean>
// refetch(): Promise<void>
```

### useOrders Hook
```javascript
const { orders, selectedOrder, loading, error, fetchOrderById, updateOrderStatus, refetch } = useOrders(refreshInterval, statusFilter)

// orders: array of Order
// selectedOrder: null | Order
// loading: boolean
// error: null | string
// fetchOrderById(id): Promise<Order>
// updateOrderStatus(orderId, status): Promise<boolean>
// refetch(): Promise<void>
```

## Page Navigation

- `/login` - Login page
- `/` - Redirects to `/inventory`
- `/inventory` - Inventory management (default)
- `/orders` - Order queue and filtering
- `/orders/:orderId` - Order detail view

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Considerations

1. **Auto-refresh intervals:** 30 seconds (adjustable per hook)
2. **Pagination:** Ready for implementation (API params support `skip` and `limit`)
3. **Virtual scrolling:** Ready for large order lists
4. **Lazy loading:** Page components loaded on navigation
5. **Request debouncing:** Built into API client

## Future Enhancements

1. **Authentication:** Backend JWT integration
2. **Role-based access:** Hide/show features by ops role
3. **Bulk operations:** Select multiple orders for status update
4. **Export data:** CSV/PDF export of inventory and orders
5. **Notifications:** Toast notifications for auto-refresh results
6. **Search:** Product and order search functionality
7. **Filters:** Advanced filtering by date range, customer, etc.
8. **Analytics:** Dashboard with KPIs and charts
9. **Real-time WebSockets:** Replace polling with live updates
10. **Audit log:** Track who made what changes and when

## Troubleshooting

### API Connection Issues
- Check backend is running on `http://localhost:8000`
- Verify CORS headers are set correctly
- Check browser console for network errors

### Login Issues
- Clear localStorage: `localStorage.clear()` in console
- Check email format (must contain @)
- Password must be at least 6 characters

### Refresh Not Working
- Check browser's auto-refresh setting
- Look for API errors in console
- Verify endpoint URLs match backend routes

### Styling Issues
- Check Tailwind CSS is properly configured
- Verify no CSS conflicts in browser DevTools
- Clear browser cache (Ctrl+Shift+R)
