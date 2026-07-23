# Manual Testing Guide - UC4 Frontend Fixes

**Goal:** Verify both fixes work correctly  
**Estimated Time:** 15 minutes  
**Prerequisites:** Backend and frontend running

---

## Step 0: Start Backend & Frontend

### Terminal 1: Start Backend
```bash
cd /home/plohvinov/Desktop/capsotne/backend
python3 main.py
```

**Expected Output:**
```
INFO:main:Loaded Auth router
INFO:main:Loaded UC1 Products router
INFO:main:Loaded UC1 Orders router
INFO:main:Loaded UC2 Promotions router
INFO:main:Loaded Inventory router
INFO:uvicorn.server:Uvicorn running on http://127.0.0.1:8000
Press CTRL+C to quit
```

✅ **Success if:** You see "Uvicorn running" message

---

### Terminal 2: Start Frontend
```bash
cd /home/plohvinov/Desktop/capsotne/frontend
npm run dev
```

**Expected Output:**
```
  VITE v5.4.21  ready in 208 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

✅ **Success if:** You see "ready in XXX ms" message

---

## Test 1: Verify ordersAPI.createOrder() Exists (5 min)

### Step 1: Open Browser Developer Console

1. Open http://localhost:5173 in your browser
2. Press **F12** (or Fn+F12 on Mac)
3. Click on the **Console** tab at the bottom

### Step 2: Check if Method Exists

Paste this in the console and press Enter:

```javascript
import('./api/orders.js').then(m => {
  console.log('✅ ordersAPI.createOrder exists:', typeof m.ordersAPI.createOrder === 'function')
  console.log('Method details:', m.ordersAPI.createOrder.toString().substring(0, 200))
})
```

### What You Should See:

```
✅ ordersAPI.createOrder exists: true
Method details: async (customerId, items, couponCode) => {
    const response = await apiClient.post('/orders', {
      customer_id: customerId,
      items: items.map(item => ({
```

✅ **Success if:** You see "true" and the method code appears

---

## Test 2: Verify OpsDashboard Route Works (5 min)

### Step 1: Navigate to OpsDashboard Route

1. Go to http://localhost:5173/ops-dashboard
2. **Expected:** Should redirect to login page

### Step 2: Check Page Loads Without Errors

**What You Should See:**
- ✅ Login page appears with email/password form
- ✅ No red error messages
- ✅ No "404 Not Found" errors
- ✅ F12 Console should be clean (no errors in red)

### Step 3: Check Console for Errors

In F12 Console, you should see NO red error messages. If you see errors, they should be network-related (expected, since we might not have auth).

✅ **Success if:** Page loads, redirects to login, no JS errors

---

## Test 3: Test Order Tracking Page (5 min)

### Step 1: Navigate to Order Tracking

1. Close the developer console (F12 again)
2. Go to http://localhost:5173/order-tracking
3. Wait for page to load (should show search form)

### Step 2: Search for a Valid Order

1. In the search field, type: **1**
2. Click the **"Track"** button
3. Wait 2-3 seconds for results

### Step 3: Verify Order Details Appear

**What You Should See:**

```
Order #1
═══════════════════════════════════════════

Customer: Alice Johnson
Status: PENDING ⏳

Items
─────────────────────────────────────────
Widget A × 2                          $59.98
Widget C × 1                          $79.99

Subtotal:                           $139.97
Discount:                              $0.00
─────────────────────────────────────────
Total:                              $139.97

Status Timeline
─────────────────────────────────────────
📦 Pending (current - highlighted)
📍 Confirmed
📍 Shipped  
✅ Delivered
```

✅ **Success if:** All above information appears correctly

---

## Test 4: Test Invalid Order (2 min)

### Step 1: Clear Search and Try Invalid Order

1. Clear the search field
2. Type: **9999** (non-existent order)
3. Click "Track" button

### Step 2: Verify Error Message

**Expected to see:**
```
Order not found. Please check the order ID.
```

✅ **Success if:** Error message appears, no page crash

---

## Test 5: Test Order with Coupon (3 min)

### Step 1: Search for Order with Coupon

1. Clear search field
2. Type: **1003** (this order has coupon)
3. Click "Track" button

### Step 2: Verify Coupon Appears

**What You Should See:**
```
Order #1003
═══════════════════════════════════════════

Customer: Diana Davis
Coupon: SUMMER10 ✅              ← NEW: Shows coupon code
Status: DELIVERED ✅

Items
─────────────────────────────────────────
Gadget Y × 1                          $99.99

Subtotal:                            $99.99
Discount:                             $10.00  ← Shows discount
─────────────────────────────────────────
Total:                               $89.99
```

✅ **Success if:** Coupon code and discount amount appear

---

## Test 6: Browser Console Tests (3 min)

### Step 1: Run Adapter Tests

1. Make sure F12 Console is open
2. Copy and paste this command:

```javascript
import('./adapters/uc4-adapter.test.js').then(m => m.runAllTests())
```

3. Press Enter and wait for results

### Step 2: Verify All Tests Pass

**Expected Output:**
```
═══════════════════════════════════════════
Running UC4 Adapter Tests
═══════════════════════════════════════════

Test: Get Order by ID
  ✅ PASSED - Retrieved order 1: Alice Johnson

Test: Get Non-Existent Order
  ✅ PASSED - Correctly returned error for order 9999

Test: Get Customer Orders
  ✅ PASSED - Retrieved 1 order for customer 1

Test: Get All Orders
  ✅ PASSED - Retrieved 10 total orders

Test: Get Orders Filtered by Status
  ✅ PASSED - Filtered 3 orders with pending status

Test: Update Order Status (Valid)
  ✅ PASSED - Updated order 1 from pending → confirmed

Test: Update Order Status (Invalid)
  ✅ PASSED - Correctly rejected invalid transition (delivered → pending)

Test: Update Non-Existent Order
  ✅ PASSED - Correctly returned error for order 9999

═══════════════════════════════════════════
Summary: 8 passed, 0 failed ✅
═══════════════════════════════════════════
```

✅ **Success if:** All 8 tests show ✅ PASSED

---

## Test 7: Check Mock Data Service (2 min)

### Step 1: View All Mock Orders

In F12 Console, paste:

```javascript
import('./services/mockOrdersService.js').then(m => {
  const state = m.default.getState()
  console.log('Total orders in mock service:', state.length)
  state.forEach(order => {
    console.log(`Order ${order.id}: ${order.customer_id} - ${order.status} - $${order.total}`)
  })
})
```

### Step 2: Verify Data

**Expected to see:**
```
Total orders in mock service: 10
Order 1: 1 - pending - $139.97
Order 1001: 2 - confirmed - $49.99
Order 1002: 3 - shipped - $199.99
Order 1003: 4 - delivered - $99.99
... (6 more orders)
```

✅ **Success if:** 10 orders listed with various statuses

---

## Test 8: Build Verification (2 min)

Open a new terminal (Terminal 3):

```bash
cd /home/plohvinov/Desktop/capsotne/frontend
npm run build
```

**Expected Output:**
```
vite v5.4.21 building for production...
transforming...
✓ 105 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.64 kB │ gzip:  0.38 kB
dist/assets/index-D5txIL_p.css   25.34 kB │ gzip:  5.04 kB
dist/assets/index-R6CGwG-f.js   265.33 kB │ gzip: 82.91 kB
✓ built in 2.14s
```

✅ **Success if:** ✓ built successfully, no warnings

---

## Test 9: Code Verification (1 min)

### Verify createOrder Method Was Added

Open Terminal 3 and run:

```bash
grep -A 8 "createOrder:" /home/plohvinov/Desktop/capsotne/frontend/src/api/orders.js
```

**Expected Output:**
```
createOrder: async (customerId, items, couponCode) => {
  const response = await apiClient.post('/orders', {
    customer_id: customerId,
    items: items.map(item => ({
      product_id: item.id,
      quantity: item.quantity,
    })),
    coupon_code: couponCode,
```

✅ **Success if:** Code appears correctly

---

## Test 10: Check No Console Errors (2 min)

### Step 1: Open F12 Console Again

1. Go back to http://localhost:5173/order-tracking
2. Press F12
3. Click Console tab

### Step 2: Look for Errors

**You should see:**
- ✅ Some INFO messages (normal)
- ✅ No RED error messages
- ✅ No "Cannot find module" messages
- ✅ No 404 errors

**If you see red errors**, make note of them and let me know.

---

## Test 11: Responsive Design Check (2 min)

### Step 1: Test on Desktop (1920x1080)

1. Go to http://localhost:5173/order-tracking
2. Search for order 1
3. Verify layout looks good with full width

### Step 2: Test on Tablet (768x1024)

1. Press F12
2. Click the device toggle icon (mobile phone icon) in DevTools
3. Select "iPad" or tablet size
4. Verify content still looks good

### Step 3: Test on Mobile (375x667)

1. In DevTools, select "iPhone 12" or similar
2. Verify single-column layout works
3. Verify buttons are clickable

✅ **Success if:** All layouts look good and readable

---

## Quick Checklist - Print This

Use this checklist while testing:

```
ISSUE #1: createOrder() Method
[ ] Method exists (console test)
[ ] No errors when checking method
[ ] Checkout can import it

ISSUE #2: OpsDashboard Route
[ ] /ops-dashboard doesn't 404
[ ] Redirects to login (expected)
[ ] No JS errors on page

ORDER TRACKING TESTS
[ ] Order 1 appears with all details
[ ] Coupon displayed for order 1003
[ ] Error shown for order 9999
[ ] All 4 status steps visible
[ ] Timeline shows current status

ADAPTER TESTS
[ ] 8/8 tests pass
[ ] No test failures
[ ] Console shows summary

DATA TESTS
[ ] Mock service has 10 orders
[ ] Orders have correct data
[ ] Coupons appear in data

BUILD TESTS
[ ] npm run build succeeds
[ ] 105 modules transformed
[ ] No warnings
[ ] Output is 265 KB JS

CODE TESTS
[ ] createOrder code is correct
[ ] Method maps items correctly
[ ] coupon_code is included

CONSOLE TESTS
[ ] No red error messages
[ ] No 404 errors
[ ] Clean console (except info)

RESPONSIVE TESTS
[ ] Desktop looks good
[ ] Tablet looks good
[ ] Mobile looks good
```

---

## Troubleshooting During Testing

### "Cannot find module" error
**Solution:**
1. Stop frontend (Ctrl+C)
2. Run `npm install` in frontend folder
3. Run `npm run dev` again

### "Port 5173 already in use"
**Solution:**
```bash
# Kill the port
lsof -i :5173 | tail -1 | awk '{print $2}' | xargs kill -9
# Then restart frontend
npm run dev
```

### Order data not loading
**Solution:**
1. Check backend is running (Terminal 1 should show "Uvicorn running")
2. Check frontend console for errors (F12)
3. Try refreshing page (Ctrl+R)

### Tests show "Failed" instead of "Passed"
**Solution:**
1. Check backend is running
2. Check console (F12) for detailed error messages
3. Take a screenshot of error and let me know

### "Order not found" for order 1
**Solution:**
1. This is expected - mock data has orders 1, 1001-1010
2. Try order 1003 (has coupon)
3. Try order 1001 (confirmed status)

---

## What to Take Screenshots Of

If you want to share results, take screenshots of:

1. Order tracking page showing order 1 details
2. Order tracking page showing order with coupon (1003)
3. Browser console showing test results (all 8 passing)
4. F12 Network tab showing no errors
5. Build output showing "✓ built in 2.14s"

---

## Success Criteria Summary

**Issue #1 (createOrder) is FIXED if:**
- ✅ Method exists and is callable
- ✅ Console test shows "true"
- ✅ No build warnings
- ✅ grep shows correct code

**Issue #2 (OpsDashboard) is FIXED if:**
- ✅ Route doesn't 404
- ✅ Page redirects to login (correct behavior)
- ✅ No JS errors
- ✅ Can see login form

**Overall Testing PASSES if:**
- ✅ All 10 tests above complete successfully
- ✅ No red errors in console
- ✅ Build succeeds
- ✅ 8/8 adapter tests pass

---

## All Tests Done? ✅

If all the above tests pass:
- ✅ Both blocking issues are FIXED
- ✅ Frontend is DEPLOYMENT-READY
- ✅ Ready for backend integration

**Next steps:**
1. Proceed to test Checkout flow (once UC1 backend ready)
2. Test coupon validation (once UC2 backend ready)
3. Connect adapter to real API

---

**Need Help?**
- Check console (F12) for actual error messages
- Post screenshot of any red errors
- Note which test failed
- Check Terminal 1 & 2 for backend/frontend errors
