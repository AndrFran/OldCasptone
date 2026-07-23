# UC4 Testing Checklist

**Date:** 2026-07-23  
**Status:** Ready for testing  
**Estimated Time:** 15-30 minutes for full suite

---

## Pre-Testing Setup ✅

- [x] Backend running at http://localhost:8000
- [x] Database seeded with sample data
- [x] Test order #1 created
- [x] Frontend code created and integrated
- [x] npm dependencies installed
- [x] Documentation prepared

**Action:** Start frontend with: `cd frontend && npm run dev`

---

## Frontend Startup Test (5 min)

### Should Pass
- [ ] Frontend starts without errors
- [ ] No errors in terminal
- [ ] Server starts at http://localhost:5173
- [ ] Vite message shows: "ready in XXX ms"

### If Issues
```
❌ Frontend won't start
   → Check: npm list --depth=0
   → Fix: npm install (reinstall)
   → Retry: npm run dev
```

---

## Order Tracking Page Test (10 min)

### Test 1: Search for Valid Order
**Steps:**
1. Go to: http://localhost:5173/order-tracking
2. Enter Order ID: `1`
3. Click: "Track" button
4. Wait for results

**Expected Results:**
- [ ] Page loads without errors
- [ ] Order details appear
- [ ] Order #1 displayed in header
- [ ] Customer name: "Alice Johnson"
- [ ] Status shows: "pending"
- [ ] Items list appears:
  - [ ] Widget A × 2 @ $29.99
  - [ ] Widget C × 1 @ $79.99
- [ ] Pricing shows:
  - [ ] Subtotal: $139.97
  - [ ] Discount: $0.00
  - [ ] Total: $139.97
- [ ] Status timeline shows:
  - [ ] pending (current - highlighted)
  - [ ] confirmed
  - [ ] shipped
  - [ ] delivered
- [ ] No console errors (F12)

**Screenshots to Take:**
- [ ] Order details page (full view)
- [ ] Status timeline section
- [ ] Items and pricing breakdown

### Test 2: Invalid Order ID
**Steps:**
1. Clear the input field
2. Enter Order ID: `9999`
3. Click: "Track" button

**Expected Results:**
- [ ] Error message displays
- [ ] Message says: "Order not found" or similar
- [ ] Order details disappear
- [ ] Can search again
- [ ] No console errors

**Screenshots to Take:**
- [ ] Error message

### Test 3: Empty Search
**Steps:**
1. Click "Track" without entering an ID

**Expected Results:**
- [ ] Validation message appears: "Please enter an order ID"
- [ ] No API call made
- [ ] Can enter ID and try again

---

## Order Queue Page Test (10 min)

### Test 1: Load Order List
**Steps:**
1. Go to: http://localhost:5173/orders
2. Wait for list to load

**Expected Results:**
- [ ] Page loads without errors
- [ ] Title shows: "Order Queue"
- [ ] Refresh button appears
- [ ] Filter sidebar appears
- [ ] Order list displays
- [ ] Order #1 visible with:
  - [ ] Order ID: 1
  - [ ] Customer ID: 1
  - [ ] Status: PENDING (with yellow/orange badge)
  - [ ] Total: $139.97
  - [ ] Date: 2026-07-23 (or current)
- [ ] No console errors

**Screenshots to Take:**
- [ ] Full order queue page
- [ ] Order card/row in list

### Test 2: Filter by Status
**Steps:**
1. Click on status filter (sidebar)
2. Select: "Pending"
3. Observe list changes

**Expected Results:**
- [ ] List filters to show only pending orders
- [ ] Order #1 shows (it's pending)
- [ ] Filter button shows as selected
- [ ] Count updates correctly
- [ ] No "confirmed", "shipped", or "delivered" orders show
- [ ] No console errors

**Screenshots to Take:**
- [ ] Filtered order list

### Test 3: Filter by Other Status
**Steps:**
1. Click filter: "Shipped"

**Expected Results:**
- [ ] List shows no orders (correct, Order #1 is pending)
- [ ] Empty state message shows (optional)
- [ ] Can select different filter

### Test 4: Click Order
**Steps:**
1. Reset filter to "All" or "Pending"
2. Click on Order #1 card

**Expected Results:**
- [ ] Navigates to detail page OR opens modal
- [ ] Shows order details
- [ ] Can navigate back
- [ ] No console errors

---

## Browser Console Tests (5 min)

### Test 1: Load and Run Adapter Tests
**Steps:**
1. Press F12 to open DevTools
2. Click "Console" tab
3. Paste this command:
```javascript
import('./adapters/uc4-adapter.test.js').then(m => m.runAllTests())
```
4. Press Enter
5. Wait for results

**Expected Results:**
- [ ] Tests start running
- [ ] See progress messages
- [ ] 8 tests listed:
  - [ ] Test: Get Order by ID
  - [ ] Test: Get Non-Existent Order
  - [ ] Test: Get Customer Orders
  - [ ] Test: Get All Orders
  - [ ] Test: Get Orders Filtered by Status
  - [ ] Test: Update Order Status (Valid)
  - [ ] Test: Update Order Status (Invalid)
  - [ ] Test: Update Non-Existent Order
- [ ] All tests show ✅ (passed)
- [ ] Summary shows: "8 passed, 0 failed"

**Screenshots to Take:**
- [ ] Console showing test results

### Test 2: Check Mock Data
**Steps:**
1. In console, paste:
```javascript
import('./services/mockOrdersService.js').then(m => {
  console.log('Mock orders:', m.default.getState())
})
```
2. Press Enter

**Expected Results:**
- [ ] Mock data object displays
- [ ] Shows array of orders
- [ ] Should have 10 sample orders
- [ ] Each order has:
  - [ ] id
  - [ ] customer_id
  - [ ] status
  - [ ] items
  - [ ] total

**Screenshots to Take:**
- [ ] Console showing mock data

---

## Visual & Performance Tests (5 min)

### Test 1: Responsive Design
**Steps:**
1. View on full desktop (1920×1080)
2. Resize to tablet (768×1024)
3. Resize to mobile (375×667)

**Expected Results:**
- [ ] Desktop: Layout looks good
- [ ] Tablet: Content adapts, no overflow
- [ ] Mobile: Single column, readable
- [ ] Text remains legible
- [ ] Buttons clickable on mobile

### Test 2: Status Timeline Animation
**Steps:**
1. Go to order tracking page
2. Search for order #1
3. Look at status timeline

**Expected Results:**
- [ ] Timeline visual displays
- [ ] Current status (pending) highlighted/different color
- [ ] Other statuses shown in gray
- [ ] Animation/pulse effect (if implemented)
- [ ] Dates/times visible
- [ ] Icons show (if implemented)

### Test 3: Loading States
**Steps:**
1. Search for order (watch for loading)
2. Click refresh button
3. Apply filter

**Expected Results:**
- [ ] Loading indicator appears (spinner/text)
- [ ] Content updates after load
- [ ] No content flashing/flickering
- [ ] Smooth transitions

### Test 4: Performance
**Steps:**
1. Open DevTools → Network tab
2. Perform actions:
   - [ ] Search for order
   - [ ] Load order queue
   - [ ] Apply filter
3. Observe response times

**Expected Results:**
- [ ] Network requests complete in <2 seconds
- [ ] Page renders in <1 second
- [ ] No slow requests
- [ ] No failed requests

**Screenshots to Take:**
- [ ] Network tab showing request times

---

## Error Handling Tests (5 min)

### Test 1: Backend Down
**Steps:**
1. Stop backend: Kill `uvicorn` process
2. Try to search for order
3. Try to load order queue

**Expected Results:**
- [ ] Error message displays (network error)
- [ ] Page doesn't crash
- [ ] Can refresh to retry
- [ ] Message is user-friendly

**Screenshots to Take:**
- [ ] Error message

**Then:** Restart backend for other tests

### Test 2: Invalid Data
**Steps:**
1. Search with special characters: `<script>alert('test')</script>`
2. Observe handling

**Expected Results:**
- [ ] Input sanitized or escaped
- [ ] No XSS vulnerabilities
- [ ] Error message or "Order not found"
- [ ] No console errors

---

## Complete Test Results

### Overall Status
- [ ] All must-pass tests passed
- [ ] All should-pass tests passed
- [ ] All nice-to-have tests passed
- [ ] No console errors
- [ ] No critical issues found

### Issues Found
```
(List any issues encountered)
```

### Performance Summary
- Order tracking load time: ____ ms
- Order queue load time: ____ ms
- Filter response time: ____ ms
- Status update time: ____ ms

### Browser/Environment
- Browser: ________________
- OS: ____________________
- Screen Resolution: ________

---

## Sign-Off

**Tester Name:** ____________________  
**Date:** ____________________  
**Time Spent:** ____________________  
**Overall Result:** ✅ PASS / ❌ FAIL

**Notes:**
```
(Add any additional observations or recommendations)
```

**Next Steps:**
- [ ] If passed: Proceed to Phase 2 (real backend integration)
- [ ] If failed: Debug and document issues
- [ ] Screenshot evidence captured
- [ ] Documentation updated

---

## Phase 2: Real Backend Integration (When Ready)

Once UC1 backend is ready:

- [ ] Create `uc4-real-adapter.js`
- [ ] Swap imports in OrderTracking.jsx
- [ ] Swap imports in useOrders.js
- [ ] Restart frontend
- [ ] Re-run all tests with real backend
- [ ] Verify no UI changes needed
- [ ] Document results

---

## Reference: Expected Data

### Order #1
```
ID: 1
Customer ID: 1 (Alice Johnson)
Items:
  Product 1 (Widget A): Qty 2, Price $29.99, Subtotal $59.98
  Product 3 (Widget C): Qty 1, Price $79.99, Subtotal $79.99
Subtotal: $139.97
Discount: $0.00
Total: $139.97
Status: pending
Created: 2026-07-23 ~12:30:00
```

### Products
```
1. Widget A        $29.99  (50 stock)
2. Widget B        $49.99  (5 stock)
3. Widget C        $79.99  (20 stock)
4. Gadget X        $39.99  (0 stock)
5. Gadget Y        $99.99  (15 stock)
```

---

## Quick Reference: Commands

```bash
# Check backend
curl http://localhost:8000/health

# Check order in backend
curl http://localhost:8000/orders/1

# Start frontend (if not running)
cd frontend && npm run dev

# Check npm packages
npm list --depth=0

# Open DevTools
F12 (or Fn+F12)

# Run console tests
import('./adapters/uc4-adapter.test.js').then(m => m.runAllTests())
```

---

**Testing guide complete. Ready to begin testing!** 🚀
