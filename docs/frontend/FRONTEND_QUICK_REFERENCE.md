# Frontend Quick Reference

## Start the Frontend

```bash
cd frontend
npm install        # One-time setup
npm run dev       # Start dev server (http://localhost:5173)
```

## Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | ProductList | Browse all products |
| `/product/:id` | ProductDetail | View product details |
| `/cart` | Cart | View/manage shopping cart |
| `/checkout` | Checkout | Complete purchase with coupon |
| `/order-confirmation/:orderId` | OrderConfirmation | Order success page |
| `/order-tracking` | OrderTracking | Track order by ID |

## Key Components

### Page Components
- `ProductList.jsx` - Product catalog with search
- `ProductDetail.jsx` - Single product view
- `Cart.jsx` - Shopping cart
- `Checkout.jsx` - Checkout with coupon validation
- `OrderConfirmation.jsx` - Order confirmation with recommendations
- `OrderTracking.jsx` - Order status tracker

### Shared Components
- `Header.jsx` - Top navigation
- `Footer.jsx` - Footer
- `ProductCard.jsx` - Product display card
- `LoadingSpinner.jsx` - Loading state
- `ErrorMessage.jsx` - Error display

## API Endpoints Used

### Products
```javascript
GET /products                  // List all products
GET /products/{id}             // Get single product
```

### Orders
```javascript
POST /orders                   // Create new order
GET /orders/{id}              // Get order details
GET /customers/{id}/orders    // Get customer orders
GET /orders/{id}/recommendations  // Get AI recommendations
```

### Coupons
```javascript
POST /coupons/validate        // Validate coupon code
GET /promotions               // Get active promotions
```

## State Management

### App-Level State
```javascript
const [cart, setCart] = useState([])           // Shopping cart items
const [lastOrderId, setLastOrderId] = useState(null)  // Last order ID
```

### Cart Operations
```javascript
addToCart(product, quantity)         // Add/update item
removeFromCart(productId)            // Remove item
updateQuantity(productId, quantity)  // Update quantity
clearCart()                          // Empty cart
```

## Styling Classes

### Buttons
```html
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-sm">Small</button>
```

### Cards & Inputs
```html
<div class="card">Content</div>
<input class="input-field" />
```

### Badges
```html
<span class="badge-success">Success</span>
<span class="badge-warning">Warning</span>
<span class="badge-danger">Danger</span>
<span class="badge-info">Info</span>
```

## Configuration

### API URL
Update `src/api/client.js`:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
```

Or set environment variable:
```bash
VITE_API_URL=https://api.example.com npm run dev
```

## File Locations

| File | Purpose |
|------|---------|
| `src/App.jsx` | Root component with routing |
| `src/pages/*` | Page components |
| `src/components/*` | Reusable components |
| `src/api/*` | API integration |
| `src/index.css` | Global styles |
| `tailwind.config.js` | Tailwind configuration |
| `vite.config.js` | Vite configuration |

## Development Commands

```bash
npm run dev       # Start dev server
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run linter
```

## Features Checklist

- [x] Product listing with search
- [x] Product detail page
- [x] Shopping cart
- [x] Coupon validation
- [x] Order checkout
- [x] Order confirmation
- [x] Order tracking
- [x] AI recommendations
- [x] Error handling
- [x] Responsive design
- [x] Stock management
- [x] Discount calculation

## Important Notes

1. **Backend Required:** Backend must be running at http://localhost:8000
2. **Cart Persistence:** Cart is session-only (use localStorage to persist)
3. **Customer ID:** Currently hardcoded to 1 (implement auth for multi-user)
4. **Images:** Products use emoji placeholders (add real images in production)
5. **Tax Rate:** Hardcoded to 8% (make configurable if needed)

## Debugging

### Check API Calls
- Open browser DevTools → Network tab
- Watch API requests to backend

### Check State
- Install React DevTools extension
- Inspect component state/props

### Check Console
- Open browser DevTools → Console
- All errors logged there

## Deployment

```bash
# Build
npm run build

# Output: dist/ folder
# Deploy to: Vercel, Netlify, S3, etc.

# Set API URL for production
VITE_API_URL=https://api.yourdomain.com npm run build
```

## Common Tasks

### Add a New Page
1. Create component in `src/pages/`
2. Import in `App.jsx`
3. Add route: `<Route path="/new" element={<NewComponent />} />`

### Add a New API Endpoint
1. Create function in `src/api/`
2. Use `client` from `src/api/client.js`
3. Import and use in components

### Customize Styling
1. Edit `src/index.css` for global styles
2. Edit `tailwind.config.js` for Tailwind config
3. Use utility classes in JSX

## Performance Tips

- Keep bundle size small (lazy load if needed)
- Optimize images
- Cache API responses if appropriate
- Use React DevTools Profiler to find bottlenecks

## Browser Testing

Test in:
- Chrome
- Firefox
- Safari
- Edge
- Mobile browsers

## Security Checklist

- [x] HTTPS for production
- [x] No sensitive data in localStorage
- [x] Form validation
- [x] API error handling
- [x] CORS configured
- [x] No hardcoded secrets

## Getting Help

1. Check `FRONTEND_README.md` for full documentation
2. Check `CUSTOMER_FRONTEND_GUIDE.md` for feature details
3. Check backend API documentation
4. Check console for error messages

---

**Last Updated:** July 23, 2024
