# UC4 Frontend Testing Manual

**Status:** ✅ Backend Running | ✅ Database Seeded | ✅ Ready for Testing  
**Backend URL:** `http://localhost:8000`  
**Frontend URL:** `http://localhost:5173`  
**Date:** 2026-07-23

---

## Quick Start: Run Everything

### 1. Start Backend (Already Running ✅)
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
✅ Backend is running at `http://localhost:8000`  
✅ Database seeded with sample data  
✅ Health check: `curl http://localhost:8000/health`

### 2. Start Frontend (Next Step)
```bash
cd frontend
npm install  # if not done
npm run dev
```
Frontend will be at `http://localhost:5173`

### 3. Open Browser
Navigate to: **`http://localhost:5173`**

---

## Sample Data Available

### Products
```
1. Widget A        - $29.99   (50 units in stock)
2. Widget B        - $49.99   (5 units in stock)
3. Widget C        - $79.99   (20 units in stock)
4. Gadget X        - $39.99   (OUT OF STOCK)
5. Gadget Y        - $99.99   (15 units in stock)
```

### Customers
```
1. Alice Johnson   (alice@example.com)
2. Bob Smith       (bob@example.com)
3. Charlie Brown   (charlie@example.com)
```

### Coupons
```
SUMMER10   - 10% off (unlimited uses)
WELCOME20  - 20% off (100 max uses)
SAVE5      - $5 off (unlimited uses)
```

### Test Orders (Created in Backend)
```
Order #1: Customer 1 (Alice)
  - 2x Widget A ($29.99 each = $59.98)
  - 1x Widget C ($79.99 = $79.99)
  - Total: $139.97
  - Status: pending
```

---

## Testing Scenarios

### Scenario 1: View Order Tracking (Customer)

**Steps:**
1. Go to: `http://localhost:5173/order-tracking`
2. Enter Order ID: **`1`** (the test order created above)
3. Click "Track" button

**Expected Results:**
- ✅ Order details display
- ✅ Order #1 shown in header
- ✅ Status timeline shows: pending (current)
- ✅ Items listed:
  - Widget A x2 @ $29.99 = $59.98
  - Widget C x1 @ $79.99 = $79.99
- ✅ Pricing:
  - Subtotal: $139.97
  - Discount: $0.00 (no coupon used)
  - Total: $139.97
- ✅ Created date shows

**Screenshots to Take:**
- Order tracking page with order details
- Status timeline (pending highlighted)
- Order items and pricing breakdown

---

### Scenario 2: Order Not Found (Error Handling)

**Steps:**
1. Go to: `http://localhost:5173/order-tracking`
2. Enter Order ID: **`9999`** (non-existent)
3. Click "Track" button

**Expected Results:**
- ✅ Error message displays: "Order not found"
- ✅ No order details shown
- ✅ Can search again

**Screenshots to Take:**
- Error message showing order not found

---

### Scenario 3: View Ops Order Queue

**Steps:**
1. Go to: `http://localhost:5173/orders`
2. Page should load with list of orders

**Expected Results:**
- ✅ Order queue displays
- ✅ Order #1 visible in list
- ✅ Shows: Order ID, Customer ID, Status (pending), Total ($139.97)
- ✅ Status badge shows correct color (yellow for pending)
- ✅ Can click order to view details

**Screenshots to Take:**
- Order queue list view
- Order card in pending status

---

### Scenario 4: Filter Orders by Status

**Steps:**
1. Go to: `http://localhost:5173/orders`
2. Look for status filter options (sidebar)
3. Click filter: **"Pending"**

**Expected Results:**
- ✅ List filters to show only pending orders
- ✅ Order #1 visible (status: pending)
- ✅ Filter count shows 1 pending order
- ✅ Other statuses show 0 orders

**Screenshots to Take:**
- Filtered order queue (pending status)
- Status filter sidebar

---

### Scenario 5: Create Additional Test Orders (Via API)

**For testing multiple orders, run in terminal:**

```bash
# Order 2: Customer 2 (Bob) - Simple order
curl -X POST http://localhost:8000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 2,
    "items": [{"product_id": 2, "quantity": 1}],
    "coupon_code": null
  }'

# Order 3: Customer 3 (Charlie) - With coupon
curl -X POST http://localhost:8000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 3,
    "items": [{"product_id": 1, "quantity": 3}],
    "coupon_code": "SUMMER10"
  }'
```

Then refresh `/orders` page to see new orders.

---

## Detailed Testing Checklist

### Order Tracking Page (`/order-tracking`)

- [ ] **Page Loads**
  - [ ] Title: "Track Your Order"
  - [ ] Input field for order ID
  - [ ] "Track" button
  
- [ ] **Search Functionality**
  - [ ] Enter order ID `1` and click Track
  - [ ] Order details load (no page navigation)
  - [ ] Information displays correctly
  
- [ ] **Order Display**
  - [ ] Order number displayed (#1)
  - [ ] Ordered date shows
  - [ ] Status timeline shows 4 steps: pending (current), confirmed, shipped, delivered
  - [ ] Current status highlighted/animated
  
- [ ] **Items Section**
  - [ ] Shows list of ordered items
  - [ ] Each item shows: product name, quantity, price
  - [ ] Subtotals calculated correctly
  
- [ ] **Pricing Section**
  - [ ] Subtotal displays: $139.97
  - [ ] Discount section (hidden if no coupon)
  - [ ] Total displays: $139.97
  - [ ] Formatting correct (2 decimal places)
  
- [ ] **Estimated Delivery**
  - [ ] Shows for non-delivered orders
  - [ ] Estimates 3 days from order date
  
- [ ] **Error Handling**
  - [ ] Enter invalid ID (9999)
  - [ ] Error message displays
  - [ ] Can search again

### Order Queue Page (`/orders`)

- [ ] **Page Layout**
  - [ ] Title: "Order Queue"
  - [ ] Refresh button
  - [ ] Status filter sidebar
  - [ ] Orders list area
  
- [ ] **Order List**
  - [ ] Shows all orders (at least Order #1)
  - [ ] Each order shows: ID, customer, status badge, total, date
  - [ ] Status colors correct:
    - [ ] Yellow/Orange = pending
    - [ ] Blue = confirmed
    - [ ] Purple = shipped
    - [ ] Green = delivered
  
- [ ] **Status Filter**
  - [ ] Filter options available: All, Pending, Confirmed, Shipped, Delivered
  - [ ] Click filter updates list
  - [ ] Count shows correct number per status
  - [ ] Filtering works correctly
  
- [ ] **Clickable Orders**
  - [ ] Click order card
  - [ ] Navigates to detail page or opens modal
  
- [ ] **Refresh Functionality**
  - [ ] Click refresh button
  - [ ] Loading indicator shows
  - [ ] List reloads
  - [ ] Timestamp updates

### Order Detail (If Available)

- [ ] Shows full order information
- [ ] Status update dropdown (if ops mode)
- [ ] Can navigate back to queue

---

## API Testing (Backend Verification)

### Test 1: Health Check
```bash
curl http://localhost:8000/health | jq .
```
Expected: `{ "status": "ok", "version": "1.0.0" }`

### Test 2: Get Products
```bash
curl http://localhost:8000/products | jq '.items | length'
```
Expected: `5` (or more if you added extra)

### Test 3: Get Orders (All)
```bash
curl http://localhost:8000/orders | jq '.items | length'
```
Expected: `1` or more (depending on test orders created)

### Test 4: Get Specific Order
```bash
curl http://localhost:8000/orders/1 | jq '.id, .status, .total'
```
Expected:
```
1
"pending"
"139.97"
```

### Test 5: Get Customer Orders
```bash
curl http://localhost:8000/customers/1/orders | jq '.items | length'
```
Expected: `1` (Alice's orders)

---

## Browser Console Testing (Adapter Validation)

### Test 1: Run All Adapter Tests
```javascript
// Open browser DevTools (F12)
// Go to Console tab
// Paste this:

import('./adapters/uc4-adapter.test.js').then(m => {
  m.runAllTests()
})
```

### Test 2: Test Individual Functions
```javascript
import('./adapters/uc4-adapter.test.js').then(m => {
  m.testGetOrderById()
})

import('./adapters/uc4-adapter.test.js').then(m => {
  m.testGetAllOrders()
})

import('./adapters/uc4-adapter.test.js').then(m => {
  m.testUpdateOrderStatusValid()
})
```

### Test 3: View Mock Data
```javascript
import('./services/mockOrdersService.js').then(m => {
  console.log(m.default.getState())
})
```

Expected: Array of 10 mock orders with varied statuses

---

## Expected Test Results Summary

| Component | Status | Evidence |
|-----------|--------|----------|
| Backend health | ✅ | GET /health returns 200 |
| Database seeded | ✅ | 5 products, 3 customers in DB |
| Test order created | ✅ | Order #1 exists with items |
| Order tracking page | ✅ | Search by ID returns order details |
| Order queue page | ✅ | Displays list of orders |
| Status filtering | ✅ | Filter by status works |
| Error handling | ✅ | Invalid order ID shows error |
| Adapter tests | ✅ | Browser console tests pass |

---

## Troubleshooting

### Backend Not Responding
```bash
# Check if running
curl http://localhost:8000/health

# If not, restart:
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Not Loading
```bash
# Make sure dependencies installed
cd frontend
npm install

# Start dev server
npm run dev
```

### No Products Showing
```bash
# Re-seed database
python3 << 'EOF'
import sys
sys.path.insert(0, '/home/plohvinov/Desktop/capsotne/backend')

from shared.db import SessionLocal, init_db
from shared.models import Product
from decimal import Decimal

init_db()
db = SessionLocal()

products = [
    Product(name='Widget A', price=Decimal('29.99'), stock=50),
    Product(name='Widget B', price=Decimal('49.99'), stock=5),
    Product(name='Widget C', price=Decimal('79.99'), stock=20),
    Product(name='Gadget X', price=Decimal('39.99'), stock=0),
    Product(name='Gadget Y', price=Decimal('99.99'), stock=15),
]
db.add_all(products)
db.commit()
db.close()

print("✅ Products seeded")
EOF
```

### Mock Data Not Working
The mock data is in the frontend adapter, not the backend. It works immediately without backend.

To test mock vs backend:
- If you see 10 orders in `/orders` → Using real backend
- If you see different orders → Using mock data
- Check browser console for which adapter is loaded

---

## What to Look For

### Good Signs ✅
- Orders display with correct information
- Status timeline renders properly
- Filtering works without page reload
- Status badges show correct colors
- Dates and prices format correctly
- Error messages appear for invalid orders
- Page responds quickly (real backend) or with slight delay (mock)

### Issues to Report 🚩
- Blank pages or 404 errors
- Data not displaying
- Status transitions fail
- Incorrect pricing calculations
- Filter buttons don't work
- Console errors (F12 → Console)

---

## Performance Notes

**Expected Load Times:**
- Order tracking: 500–1000ms (backend response + rendering)
- Order queue: 300–800ms (backend response + rendering)
- Status update: 1–2 seconds (backend processing)
- Filter change: <100ms (client-side filter)

If times exceed these, check:
- Backend CPU usage
- Browser console for errors
- Network tab (DevTools → Network)

---

## Screenshots/Evidence to Capture

1. **Order Tracking Page**
   - Search results for valid order ID
   - Error message for invalid order ID

2. **Order Queue Page**
   - List of orders before filtering
   - List after filtering by status
   - Status badge colors

3. **Status Timeline**
   - Visual timeline showing pending status
   - Estimated delivery date

4. **Browser Console**
   - Adapter test results
   - Mock data output

5. **Network Activity**
   - Backend API calls (if using real backend)
   - Response times

---

## Final Checklist

Before declaring testing complete:

- [ ] Order tracking page displays order correctly
- [ ] Order not found error displays correctly
- [ ] Order queue shows list of orders
- [ ] Status filtering works
- [ ] Status badges show correct colors
- [ ] No JavaScript errors in console
- [ ] Page responds in acceptable time
- [ ] Adapter tests pass in console

---

## Next Steps After Testing

1. **If all tests pass:**
   - Take screenshots
   - Document any observations
   - Ready for phase 2 (real backend integration)

2. **If issues found:**
   - Note specific error messages
   - Check browser console (F12)
   - Report with screenshots

3. **For real backend integration:**
   - Create `uc4-real-adapter.js`
   - Swap one import
   - Re-test with real data

---

## Questions During Testing?

**Check:**
1. Browser console (F12 → Console) for errors
2. Backend logs (check terminal where you started uvicorn)
3. Network tab (F12 → Network) to see actual API calls

**All info needed is in this manual. Happy testing! 🎉**
