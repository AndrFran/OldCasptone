# Vibe Strike Customer Frontend

A modern, responsive React e-commerce storefront for Vibe Strike Order & Inventory Engine. Built with React 18, Vite, Tailwind CSS, and React Router v6.

## Features

### Pages Implemented

1. **Product Listing Page** (`/`)
   - Display all products with real-time stock levels
   - Search and filter functionality
   - Stock status badges (In Stock, Low Stock, Out of Stock)
   - Quick add-to-cart button
   - Stats dashboard showing total products, in-stock items, and low-stock alerts

2. **Product Detail Page** (`/product/:id`)
   - Full product information and description
   - High-resolution product showcase
   - Quantity selector with stock validation
   - Real-time stock availability indicator
   - "Add to Cart" and "Buy Now" options
   - Related product information

3. **Shopping Cart** (`/cart`)
   - View all cart items with quantities
   - Update item quantities inline
   - Remove items from cart
   - Order summary with subtotal, tax, and total
   - Sticky sidebar with checkout CTA
   - Continue shopping button

4. **Checkout Page** (`/checkout`)
   - Customer contact information collection
   - Coupon code validation
   - Real-time discount calculation (percent or fixed amount)
   - Order summary with itemized breakdown
   - Price display with tax and discount
   - Secure checkout confirmation
   - Form validation and error handling

5. **Order Confirmation Page** (`/order-confirmation/:orderId`)
   - Order success message with checkmark
   - Complete order details and receipt
   - Order ID and date/time
   - Item breakdown and pricing
   - Estimated delivery date (3 days)
   - AI-powered product recommendations (via Claude API)
   - Next steps guidance
   - Quick actions: Track Order, Continue Shopping

6. **Order Tracking Page** (`/order-tracking`)
   - Search orders by Order ID
   - Visual timeline/status tracker
   - Four-step order status flow (pending → confirmed → shipped → delivered)
   - Animated status indicators
   - Estimated delivery information
   - Complete order details and receipt view
   - Support contact CTA

### Components

- **Header** - Navigation, cart icon with count, branding
- **Footer** - Links, company info, legal
- **ProductCard** - Reusable product display component
- **LoadingSpinner** - Animated loading state
- **ErrorMessage** - Dismissible error notifications

## Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   ├── client.js           # Axios instance with interceptors
│   │   ├── products.js         # Product API endpoints
│   │   ├── orders.js           # Order API endpoints
│   │   ├── coupons.js          # Coupon API endpoints
│   │   └── inventory.js        # Inventory API endpoints
│   ├── components/
│   │   ├── Header.jsx          # Top navigation
│   │   ├── Footer.jsx          # Footer
│   │   ├── ProductCard.jsx     # Product display card
│   │   ├── LoadingSpinner.jsx  # Loading indicator
│   │   └── ErrorMessage.jsx    # Error display
│   ├── pages/
│   │   ├── ProductList.jsx     # Product listing
│   │   ├── ProductDetail.jsx   # Single product detail
│   │   ├── Cart.jsx            # Shopping cart
│   │   ├── Checkout.jsx        # Checkout flow
│   │   ├── OrderConfirmation.jsx    # Order confirmation
│   │   └── OrderTracking.jsx   # Order tracking
│   ├── App.jsx                 # Root app component
│   ├── main.jsx                # Entry point
│   └── index.css               # Global styles (Tailwind)
├── index.html                  # HTML entry point
├── vite.config.js              # Vite configuration
├── tailwind.config.js          # Tailwind CSS config
├── postcss.config.js           # PostCSS config
└── package.json                # Dependencies
```

## Installation & Setup

### Prerequisites
- Node.js 16+ and npm/yarn
- Backend API running at `http://localhost:8000`

### Installation

```bash
cd frontend
npm install
```

### Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Configuration

### API Base URL

The frontend connects to the backend API configured in `vite.config.js`:

```javascript
proxy: {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, '')
  }
}
```

To use a custom API URL, set `VITE_API_URL` environment variable:

```bash
VITE_API_URL=https://api.example.com npm run dev
```

## Styling

### Tailwind CSS

All components use Tailwind CSS for styling with custom utility classes:

- `.btn` - Base button style
- `.btn-primary` - Primary action button
- `.btn-secondary` - Secondary button
- `.card` - Card container
- `.input-field` - Form input styling
- `.badge` - Badge styling (success, warning, danger, info)

### Dark Mode Support

The styling system is optimized for light mode but can be extended for dark mode using Tailwind's `dark:` prefix.

### Responsive Design

All pages are fully responsive with breakpoints for:
- Mobile (default)
- Small screens (sm: 640px)
- Medium screens (md: 768px)
- Large screens (lg: 1024px)

## API Integration

### Products API

```javascript
import { getProducts, getProduct } from './api/products'

// List all products
const response = await getProducts(skip, limit)

// Get single product
const product = await getProduct(productId)
```

### Orders API

```javascript
import ordersAPI from './api/orders'

// Create order
const order = await ordersAPI.createOrder(customerId, items, couponCode)

// Get order details
const order = await ordersAPI.getById(orderId)

// Get customer orders
const orders = await ordersAPI.getCustomerOrders(customerId)

// Get AI recommendations
const recommendations = await ordersAPI.getRecommendations(orderId)
```

### Coupons API

```javascript
import couponsAPI from './api/coupons'

// Validate coupon
const result = await couponsAPI.validate(code)

// Get active promotions
const promotions = await couponsAPI.getPromotions()
```

## State Management

State is managed at the App level using React hooks:
- `cart` - Current shopping cart items
- `lastOrderId` - Last created order ID

Cart operations:
- `addToCart(product, quantity)` - Add or update item in cart
- `removeFromCart(productId)` - Remove item from cart
- `updateQuantity(productId, quantity)` - Update item quantity
- `clearCart()` - Empty the entire cart

## Features & Functionality

### Search & Filtering
- Real-time product search by name and description
- Live results update as user types

### Cart Management
- Persistent cart state during session
- Quantity adjustment controls
- Individual item removal
- Real-time total calculation

### Coupon System
- Coupon code validation at checkout
- Support for percentage and fixed-amount discounts
- Real-time discount calculation
- Usage limit checking
- Expiration validation

### Order Tracking
- Search orders by ID
- Visual timeline showing order progression
- Real-time status updates
- Estimated delivery calculation
- Order details and itemized receipt

### AI Recommendations
- Claude API integration for product recommendations
- Personalized suggestions based on purchase history
- Displayed on order confirmation page

## Error Handling

The frontend includes comprehensive error handling:
- API request/response error catching
- User-friendly error messages
- Error dismissal functionality
- Fallback error states
- Console logging for debugging

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Optimizations

- Code splitting via React Router
- Lazy loading of page components
- Image optimization (emoji placeholders for demo)
- Efficient state management
- CSS optimization via Tailwind

## Security Considerations

- HTTPS support for production deployments
- CORS headers properly configured
- Secure coupon validation on backend
- Order data validation
- No sensitive data stored in localStorage (except session data)

## Testing

To run linting:

```bash
npm run lint
```

## Future Enhancements

- User authentication and account management
- Wishlist functionality
- Product reviews and ratings
- Multiple payment methods
- Inventory out-of-stock notifications
- Email confirmation integration
- SMS order notifications
- Guest checkout option
- Social login integration

## Troubleshooting

### API Connection Issues
- Ensure backend is running on `http://localhost:8000`
- Check VITE_API_URL environment variable
- Verify CORS headers on backend

### Build Errors
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf .vite`

### Styling Issues
- Ensure Tailwind CSS is properly compiled
- Check `tailwind.config.js` for content paths
- Clear browser cache

## Contributing

This frontend is part of the Vibe Strike project. Follow the project's contribution guidelines.

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or feature requests, please check the main Vibe Strike project documentation.
