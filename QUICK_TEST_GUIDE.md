# UC4 Quick Test Guide

**Backend Status:** ✅ Running at `http://localhost:8000`  
**Database Status:** ✅ Seeded with sample data  
**Frontend Status:** Installing dependencies...

---

## In 60 Seconds

### Step 1: Start Frontend (Once npm finishes)
```bash
cd frontend
npm run dev
```

### Step 2: Open Browser
Navigate to: **http://localhost:5173**

### Step 3: Test Order Tracking
1. Go to: `/order-tracking`
2. Enter Order ID: **`1`**
3. Click **Track**
4. ✅ Should see order details

### Step 4: Test Order Queue
1. Go to: `/orders`
2. ✅ Should see list of orders
3. Filter by **"pending"** status
4. ✅ Should see Order #1

---

## What Should Display

### Order Tracking (Order #1)
```
Order #1
Customer: Alice Johnson
Status: Pending ⏳

Items:
  - Widget A × 2 @ $29.99 = $59.98
  - Widget C × 1 @ $79.99 = $79.99

Subtotal: $139.97
Discount: $0.00
Total: $139.97

Timeline: pending (current) → confirmed → shipped → delivered
```

### Order Queue
```
[List showing]
Order #1  | Alice Johnson | Status: PENDING | $139.97 | 2026-07-23
```

---

## Quick Tests

### Test 1: Valid Order Search ✅
```
Go to: /order-tracking
Enter: 1
Expected: Order details display
```

### Test 2: Invalid Order Search ✅
```
Go to: /order-tracking
Enter: 9999
Expected: "Order not found" error
```

### Test 3: Filter Orders ✅
```
Go to: /orders
Click: "Pending" filter
Expected: Only Order #1 shows
```

### Test 4: Browser Console Tests ✅
```javascript
// Open DevTools (F12)
// Go to Console tab
// Paste:
import('./adapters/uc4-adapter.test.js').then(m => m.runAllTests())
// Expected: 8 tests pass
```

---

## API Endpoints

### Backend Health
```bash
curl http://localhost:8000/health
# Response: {"status":"ok","version":"1.0.0"}
```

### Get Products
```bash
curl http://localhost:8000/products
# Response: 5 products with prices/stock
```

### Get Orders
```bash
curl http://localhost:8000/orders
# Response: {"items":[Order#1],"total":1}
```

### Get Specific Order
```bash
curl http://localhost:8000/orders/1
# Response: Full order details
```

---

## Sample Data Reference

### Products Available
| ID | Name | Price | Stock |
|----|------|-------|-------|
| 1 | Widget A | $29.99 | 50 |
| 2 | Widget B | $49.99 | 5 |
| 3 | Widget C | $79.99 | 20 |
| 4 | Gadget X | $39.99 | 0 |
| 5 | Gadget Y | $99.99 | 15 |

### Customers
| ID | Name | Email |
|----|------|-------|
| 1 | Alice Johnson | alice@example.com |
| 2 | Bob Smith | bob@example.com |
| 3 | Charlie Brown | charlie@example.com |

### Test Order
- **Order #1** → Customer 1 (Alice)
- Items: 2x Widget A + 1x Widget C
- Total: $139.97
- Status: Pending

---

## Expected Results

✅ **If everything works:**
1. `/order-tracking` loads and searches work
2. `/orders` shows Order #1 in list
3. Filtering shows/hides orders correctly
4. No console errors (F12)
5. Adapter tests pass in console

🚩 **If something fails:**
1. Check browser console (F12 → Console)
2. Check backend logs (terminal)
3. Verify backend running: `curl http://localhost:8000/health`

---

## Browser Console Commands

### Check if Adapter Works
```javascript
import('./adapters/uc4-adapter.js').then(m => {
  console.log('✅ Adapter loaded:', m.uc4Adapter)
})
```

### Check Mock Data
```javascript
import('./services/mockOrdersService.js').then(m => {
  console.log('Mock orders:', m.default.getState())
})
```

### Test Get Order
```javascript
import('./adapters/uc4-adapter.js').then(async m => {
  const order = await m.uc4Adapter.getOrderById(1001)
  console.log('Order:', order)
})
```

### Test Update Status
```javascript
import('./adapters/uc4-adapter.js').then(async m => {
  const updated = await m.uc4Adapter.updateOrderStatus(1001, 'confirmed')
  console.log('Updated:', updated)
})
```

---

## Files to Check

If issues occur, check these files:

```
✅ Created:
  - frontend/src/adapters/uc4-adapter.js         (adapter layer)
  - frontend/src/services/mockOrdersService.js   (mock data)
  - frontend/src/adapters/uc4-adapter.test.js    (tests)

✅ Modified:
  - frontend/src/pages/OrderTracking.jsx         (uses adapter)
  - frontend/src/hooks/useOrders.js              (uses adapter)

✅ Unchanged:
  - backend/*                                     (no changes!)
  - frontend/src/api/orders.js                   (original client, will swap later)
```

---

## Estimated Timeline

- **Backend starting:** 5 seconds ✅ (DONE)
- **Database seeding:** 2 seconds ✅ (DONE)
- **Frontend npm install:** 2-3 minutes... (INSTALLING)
- **Frontend dev server start:** 30 seconds
- **Testing:** 5-10 minutes

**Total:** ~5-10 minutes to get UI running

---

## Success Criteria

**Minimum** (UI works):
- ✅ Order tracking page loads
- ✅ Can search for order #1
- ✅ Order details display correctly

**Good** (UI fully functional):
- ✅ + Order queue shows list
- ✅ + Filtering works
- ✅ + Status colors display
- ✅ + No console errors

**Excellent** (Everything verified):
- ✅ + Adapter tests pass
- ✅ + All manual tests pass
- ✅ + API endpoints verified
- ✅ + Performance acceptable

---

## Next After Testing

1. **If tests pass:** Proceed to Phase 2 (real backend integration)
2. **If issues:** Debug with console logs, check backend health
3. **Screenshots:** Take evidence of working features
4. **Documentation:** Update test results

---

**Backend is ready. Frontend is installing. Testing guide is complete. 🚀**
