# Vibe Strike E2E Demo Checklist
**Project:** Order & Inventory Engine  
**Demo Date:** [To Be Scheduled]  
**Duration:** 15-20 minutes

---

## Pre-Demo Setup (15 minutes before)

### Terminal 1: Start Backend
```bash
cd C:\Capstone\capsotne\backend
pip install -r requirements.txt  # If not installed
python -m pip install pytest pytest-asyncio httpx  # Test deps
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
✅ Database ready
📊 Tables created: products, customers, orders, order_items, coupons
```

### Terminal 2: Verify API is Running
```bash
# Test health check
curl http://localhost:8000/health

# Test products endpoint
curl http://localhost:8000/products

# View Swagger UI
# Open browser: http://localhost:8000/docs
```

### Terminal 3: Run Integration Tests (Optional)
```bash
cd C:\Capstone\capsotne
pytest tests/integration_test_suite.py -v --tb=short -x
```

Expected: All 30+ tests passing ✅

### Browser Tabs: Open These
1. **Backend API Docs:** http://localhost:8000/docs
2. **Chrome DevTools Console** (F12) - for seeing API calls
3. **Database Viewer** (optional) - to show data changes

---

## Demo Walkthrough (Scripted)

### Part 1: BROWSE PRODUCTS (2 minutes)

**Narrative:** "Customer opens Vibe Strike storefront to browse available products."

#### Step 1.1: Show Product Catalog
```bash
curl http://localhost:8000/products | jq .
```

**Expected Response:**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Widget A",
      "price": "29.99",
      "stock": 100,
      "low_stock_threshold": 10
    },
    {
      "id": 2,
      "name": "Widget B",
      "price": "49.99",
      "stock": 1,
      "low_stock_threshold": 10
    },
    {
      "id": 3,
      "name": "Widget C",
      "price": "15.99",
      "stock": 5,
      "low_stock_threshold": 10
    }
  ],
  "total": 3
}
```

**Demo Point:** "Look at the stock levels - Widget B only has 1 unit left, Widget C has 5."

#### Step 1.2: Get Single Product Details
```bash
curl http://localhost:8000/products/1 | jq .
```

**Expected Response:**
```json
{
  "id": 1,
  "name": "Widget A",
  "description": "Premium widget",
  "price": "29.99",
  "stock": 100,
  "low_stock_threshold": 10,
  "created_at": "2026-07-23T10:00:00Z"
}
```

**Demo Point:** "Customer sees full details including current price and stock availability."

✅ **Checkpoint 1: Product browsing works**

---

### Part 2: PLACE ORDER WITH COUPON (3 minutes)

**Narrative:** "Customer adds products to cart and applies a discount code."

#### Step 2.1: Validate Coupon Code
```bash
curl -X POST http://localhost:8000/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{"code": "SUMMER10"}' | jq .
```

**Expected Response:**
```json
{
  "code": "SUMMER10",
  "valid": true,
  "discount_type": "percent",
  "value": 10,
  "expires_at": "2026-12-31T23:59:59Z",
  "remaining_uses": 100
}
```

**Demo Point:** "Coupon is valid! Customer will get 10% off."

#### Step 2.2: Show Invalid Coupon Error
```bash
curl -X POST http://localhost:8000/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{"code": "INVALID"}' | jq .
```

**Expected Response (400):**
```json
{
  "detail": {
    "error": "Coupon code 'INVALID' does not exist",
    "code": "COUPON_NOT_FOUND"
  }
}
```

**Demo Point:** "Invalid codes are rejected with a clear error message."

#### Step 2.3: Place Order with Coupon
```bash
curl -X POST http://localhost:8000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [
      {"product_id": 1, "quantity": 2},
      {"product_id": 3, "quantity": 1}
    ],
    "coupon_code": "SUMMER10"
  }' | jq .
```

**Expected Response (201):**
```json
{
  "id": 1,
  "customer_id": 1,
  "status": "pending",
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "price": "29.99",
      "subtotal": "59.98"
    },
    {
      "product_id": 3,
      "quantity": 1,
      "price": "15.99",
      "subtotal": "15.99"
    }
  ],
  "subtotal": "75.97",
  "discount_amount": "7.60",
  "total": "68.37",
  "coupon_code": "SUMMER10",
  "created_at": "2026-07-23T10:30:00Z",
  "message": "Order created successfully"
}
```

**Demo Point:** "Order created! Discount applied: $75.97 - $7.60 = $68.37"

✅ **Checkpoint 2: Order placement with coupon works**

---

### Part 3: VERIFY INVENTORY DECREMENTED (2 minutes)

**Narrative:** "Order was placed. Let's verify inventory updated correctly."

#### Step 3.1: Check Updated Stock
```bash
curl http://localhost:8000/products/1 | jq '.stock'
```

**Expected Response:**
```
98
```

**Demo Point:** "Widget A stock decreased from 100 → 98 (2 units ordered). Automatic, atomic decrement!"

#### Step 3.2: Show Inventory Levels
```bash
curl http://localhost:8000/inventory | jq .
```

**Expected Response:**
```json
{
  "items": [
    {
      "product_id": 1,
      "product_name": "Widget A",
      "stock": 98,
      "low_stock_threshold": 10,
      "price": "29.99"
    },
    {
      "product_id": 2,
      "product_name": "Widget B",
      "stock": 1,
      "low_stock_threshold": 10,
      "price": "49.99"
    },
    {
      "product_id": 3,
      "product_name": "Widget C",
      "stock": 4,
      "low_stock_threshold": 10,
      "price": "15.99"
    }
  ],
  "total": 3
}
```

**Demo Point:** "All inventory updated correctly. Widget A: 98, Widget C: 4."

✅ **Checkpoint 3: Inventory decrements correctly**

---

### Part 4: RACE CONDITION TEST (3 minutes)

**Narrative:** "Critical test - two customers try to buy the last unit simultaneously. Only one should succeed."

#### Step 4.1: Show Widget B has 1 unit
```bash
curl http://localhost:8000/products/2 | jq '.stock'
# Expected: 1
```

#### Step 4.2: Execute Race Condition Test
```bash
# Option A: Run pytest (cleanest)
cd C:\Capstone\capsotne
pytest tests/integration_test_suite.py::test_race_condition_last_unit -v

# Option B: Manual concurrent orders (two terminals)
# Terminal A:
curl -X POST http://localhost:8000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [{"product_id": 2, "quantity": 1}]
  }'

# Terminal B (run immediately after):
curl -X POST http://localhost:8000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 2,
    "items": [{"product_id": 2, "quantity": 1}]
  }'
```

**Expected Results:**
- **Terminal A:** Returns 201 (order succeeded)
  ```json
  {"id": 2, "customer_id": 1, "status": "pending", "total": "49.99"}
  ```

- **Terminal B:** Returns 409 or 400 (out of stock)
  ```json
  {"detail": "Product 'Widget B' only has 0 in stock, requested 1"}
  ```

**Demo Point:** "🎯 CRITICAL SUCCESS! Race condition prevented. Only ONE order succeeded, NO overselling. This is why we use SERIALIZABLE isolation + FOR UPDATE locks!"

✅ **Checkpoint 4: Race condition prevention verified**

---

### Part 5: ORDER TRACKING (2 minutes)

**Narrative:** "Customer tracks their order status through the system."

#### Step 5.1: Get Order Details
```bash
curl http://localhost:8000/orders/1 | jq .
```

**Expected Response:**
```json
{
  "id": 1,
  "customer_id": 1,
  "status": "pending",
  "items": [...],
  "subtotal": "75.97",
  "discount_amount": "7.60",
  "total": "68.37",
  "coupon_code": "SUMMER10",
  "created_at": "2026-07-23T10:30:00Z",
  "updated_at": "2026-07-23T10:30:00Z"
}
```

**Demo Point:** "Order 1 is pending. Items and total visible."

#### Step 5.2: Update Order Status (Ops Manager)
```bash
# pending → confirmed
curl -X PATCH http://localhost:8000/orders/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "confirmed"}' | jq '.status'
# Expected: "confirmed"

# confirmed → shipped
curl -X PATCH http://localhost:8000/orders/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "shipped"}' | jq '.status'
# Expected: "shipped"

# shipped → delivered
curl -X PATCH http://localhost:8000/orders/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "delivered"}' | jq '.status'
# Expected: "delivered"
```

**Demo Point:** "Ops manager updates order through workflow. Customer can track progress: pending → confirmed → shipped → delivered."

✅ **Checkpoint 5: Order tracking and status updates work**

---

### Part 6: LOW-STOCK ALERTS (2 minutes)

**Narrative:** "Ops manager monitors inventory and restocks when needed."

#### Step 6.1: View Low-Stock Alerts
```bash
curl http://localhost:8000/inventory/low-stock | jq .
```

**Expected Response:**
```json
{
  "items": [
    {
      "product_id": 3,
      "product_name": "Widget C",
      "current_stock": 4,
      "low_stock_threshold": 10,
      "urgency": "critical"
    },
    {
      "product_id": 2,
      "product_name": "Widget B",
      "current_stock": 0,
      "low_stock_threshold": 10,
      "urgency": "critical"
    }
  ],
  "total": 2
}
```

**Demo Point:** "Ops dashboard shows critical alerts. Widget C at 4 units (below 10 threshold), Widget B out of stock."

#### Step 6.2: Restock Product
```bash
# Restock Widget B
curl -X PATCH http://localhost:8000/inventory/2 \
  -H "Content-Type: application/json" \
  -d '{"quantity": 50}' | jq '.stock'
# Expected: 50
```

**Demo Point:** "Restock: Widget B now has 50 units. Alert cleared."

#### Step 6.3: Verify Alert Cleared
```bash
curl http://localhost:8000/inventory/low-stock | jq '.items[] | select(.product_id == 2)'
# Expected: (empty - Widget B no longer in alerts)
```

**Demo Point:** "Low-stock alert for Widget B is gone!"

✅ **Checkpoint 6: Low-stock alerts and restocking work**

---

### Part 7: ERROR HANDLING (1 minute)

**Narrative:** "System handles errors gracefully with proper HTTP status codes."

#### Step 7.1: Test 404 Not Found
```bash
curl http://localhost:8000/products/99999
# Expected: 404
```

#### Step 7.2: Test 400 Bad Request (Out of Stock)
```bash
curl -X POST http://localhost:8000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [{"product_id": 2, "quantity": 100}]
  }'
# Expected: 400 with "out of stock" message
```

#### Step 7.3: Test 400 Bad Request (Invalid Coupon)
```bash
curl -X POST http://localhost:8000/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{"code": "EXPIRED"}'
# Expected: 400 with "expired" message
```

**Demo Point:** "Proper error codes: 404 for not found, 400 for validation errors, 409 for race conditions."

✅ **Checkpoint 7: Error handling correct**

---

## Post-Demo (Optional)

### Show Swagger UI
Open browser: http://localhost:8000/docs

**Demo Points:**
- All endpoints documented
- Request/response schemas visible
- Try-it-out feature for testing
- Complete OpenAPI 3.0.0 spec

### Show Test Results
```bash
pytest tests/integration_test_suite.py -v --tb=short
```

**Expected:** All 30+ tests passing ✅

### Show Architecture
Display `INTEGRATION_REPORT.md` diagram showing:
- 4 UC modules
- Database schema
- Integration points
- Data flow

---

## Expected Timings

| Step | Time | Cumulative |
|------|------|-----------|
| Part 1: Browse Products | 2 min | 2 min |
| Part 2: Place Order | 3 min | 5 min |
| Part 3: Inventory Decrement | 2 min | 7 min |
| Part 4: Race Condition | 3 min | 10 min |
| Part 5: Order Tracking | 2 min | 12 min |
| Part 6: Low-Stock Alerts | 2 min | 14 min |
| Part 7: Error Handling | 1 min | 15 min |
| **TOTAL** | **15 min** | - |

(Swagger UI + Tests = +5 minutes optional)

---

## Troubleshooting During Demo

### Issue: Port 8000 Already in Use
```bash
# Find process using port 8000
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or use different port
uvicorn main:app --port 8001
```

### Issue: Database Errors
```bash
# Reset database
cd backend
python -c "from shared.db import drop_db, init_db; drop_db(); init_db()"

# Restart API
uvicorn main:app --reload
```

### Issue: CORS Errors in Browser
Check `backend/config.py`:
```python
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
```

Should include your frontend origin.

### Issue: Coupon/Products Not Found
Verify database initialized:
```bash
curl http://localhost:8000/health  # Should return 200
curl http://localhost:8000/products  # Should return 3 products
curl http://localhost:8000/coupons/validate -X POST -d '{"code":"SUMMER10"}'  # Should validate
```

---

## Talking Points (Rehearse)

### Architecture
- "4 independent use cases integrated via shared database"
- "Atomic transactions prevent overselling"
- "FOR UPDATE locks ensure race-condition safety"

### Race Condition Prevention
- "Two simultaneous requests for last unit"
- "Database-level locking (FOR UPDATE)"
- "SERIALIZABLE isolation level"
- "Only one succeeds, no overselling"

### Integration
- "UC1 (orders) calls UC2 (coupons) for discount"
- "UC1 decrements UC3 (inventory) stocks"
- "UC4 (tracking) shows ops dashboard"
- "All share same database schema"

### Error Handling
- "400 = Bad Request (validation, out of stock)"
- "404 = Not Found"
- "409 = Conflict (race condition)"
- "500 = Server Error"

---

## Key Success Metrics

After demo, verify:

- ✅ All 7 checkpoints passed
- ✅ No unhandled exceptions
- ✅ Response times < 500ms
- ✅ Product stock decreased after order
- ✅ Race condition test showed 1 success + 1 failure
- ✅ Coupon discount calculated correctly
- ✅ Order status workflow complete
- ✅ Low-stock alerts accurate

---

## Demo Success! 🎉

If all checkpoints pass and talking points resonate, demo is successful.

**Next Steps:**
1. Answer questions
2. Show test results
3. Discuss architecture
4. Discuss deployment options

---

**Good luck with the demo!** 🚀
