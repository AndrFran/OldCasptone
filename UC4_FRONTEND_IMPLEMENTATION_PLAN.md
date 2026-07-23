# UC4 Frontend Implementation Plan

**Scope:** Frontend UI + Mock Adapter Layer ONLY  
**Constraint:** No backend modifications; UI completely decoupled from data source  
**Testing:** All work validated with mock data before integration

---

## Overview: Architecture & Separation of Concerns

```
┌─────────────────────────────────────────────┐
│  React Components (UI Layer)                 │
│  - OrderTracking.jsx (customer page)        │
│  - OrdersPage.jsx (ops queue)               │
│  - OrderQueue.jsx, OrderDetail.jsx, etc.    │
└─────────────────┬───────────────────────────┘
                  │ Uses
┌─────────────────▼───────────────────────────┐
│  Adapter Layer (Data Interface)              │
│  - src/adapters/uc4-adapter.js              │
│  - Defines: IOrdersDataSource interface     │
│  - Implements mock, real, stub versions     │
└─────────────────┬───────────────────────────┘
                  │ Uses
┌─────────────────▼───────────────────────────┐
│  Data Service (Concrete Implementation)      │
│  - MockOrdersService (current)              │
│  - RealOrdersService (swap later)           │
│  - Returns: Promises<Order>, handles API    │
└─────────────────────────────────────────────┘
```

### Key Design Principle
**UI knows about adapter interface only.** UI never imports API clients directly. When switching from mock to real backend, only adapter implementation changes; UI code untouched.

---

## Step 1: Create Adapter Layer

**File:** `frontend/src/adapters/uc4-adapter.js`

**Purpose:**
- Define interface that both mock and real implementations satisfy
- Hide implementation details from UI components
- Enable easy swapping of data sources

**Interface Methods:**
```javascript
interface IOrdersAdapter {
  getOrderById(orderId) -> Promise<Order>
  getCustomerOrders(customerId) -> Promise<Order[]>
  getAllOrders(filters?) -> Promise<Order[]>
  updateOrderStatus(orderId, newStatus) -> Promise<Order>
}
```

**Implementation (Initial = Mock):**
```javascript
// Mock implementation (hardcoded test data)
const mockOrdersAdapter = {
  getOrderById(orderId) { /* return mock order */ },
  getCustomerOrders(customerId) { /* return mock list */ },
  getAllOrders(filters) { /* return mock list */ },
  updateOrderStatus(orderId, status) { /* update mock */ },
}
```

---

## Step 2: Create Mock Data Service

**File:** `frontend/src/services/mockOrdersService.js`

**Purpose:**
- Generate realistic mock order data (5–10 sample orders)
- Simulate status changes (for demo)
- Store mock state in memory (persists during session)
- Implement polling behavior (simulate API delays)

**Data Structure:**
```javascript
const mockOrders = [
  {
    id: 1001,
    customer_id: 1,
    status: 'pending',
    items: [
      { product_id: 1, product_name: 'Widget A', quantity: 2, price: 29.99, subtotal: 59.98 }
    ],
    subtotal: 59.98,
    discount_amount: 0,
    coupon_code: null,
    total: 59.98,
    created_at: '2026-07-23T10:05:00Z',
    updated_at: '2026-07-23T10:05:00Z',
  },
  // ... more sample orders with different statuses
]
```

**Features:**
- Auto-advance some orders (e.g., orders created >1 min ago → auto-shipped for demo)
- Realistic created_at/updated_at timestamps
- Mix of statuses (pending, confirmed, shipped, delivered)
- Include items, pricing, discounts for completeness

---

## Step 3: Create Adapter Implementation (Mock)

**File:** `frontend/src/adapters/uc4-adapter.js`

**Implementation:**
```javascript
import { mockOrdersService } from '../services/mockOrdersService'

export const uc4Adapter = {
  // Get single order by ID
  async getOrderById(orderId) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const order = mockOrdersService.getOrderById(orderId)
    if (!order) throw new Error('Order not found')
    return order
  },

  // Get all orders for customer
  async getCustomerOrders(customerId) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return mockOrdersService.getOrdersByCustomer(customerId)
  },

  // Get all orders (with optional status filter)
  async getAllOrders(filters = {}) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return mockOrdersService.getAllOrders(filters)
  },

  // Update order status
  async updateOrderStatus(orderId, newStatus) {
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Validate transition
    const validTransitions = {
      'pending': ['confirmed'],
      'confirmed': ['shipped'],
      'shipped': ['delivered'],
      'delivered': [],
    }
    
    const order = mockOrdersService.getOrderById(orderId)
    if (!order) throw new Error('Order not found')
    
    if (!validTransitions[order.status]?.includes(newStatus)) {
      throw new Error(`Invalid transition: ${order.status} → ${newStatus}`)
    }
    
    return mockOrdersService.updateOrderStatus(orderId, newStatus)
  },
}
```

---

## Step 4: Update Existing Components (NO Changes to UI Logic)

**OrderTracking.jsx:**
- Already imports `ordersAPI` — We replace this with `uc4Adapter`
- Change: `import { uc4Adapter } from '../adapters/uc4-adapter'`
- Change: `const order = await uc4Adapter.getOrderById(orderId)` (same interface, so no other changes needed!)

**useOrders.js hook:**
- Already uses `ordersAPI` — We replace with `uc4Adapter`
- Change: `import { uc4Adapter } from '../adapters/uc4-adapter'`
- Change: `const data = await uc4Adapter.getAllOrders(params)`
- No other changes needed!

**Key Point:** UI components don't need to change; only the import source changes.

---

## Step 5: Add Polling with Auto-Refresh

**Enhancement to OrderTracking.jsx:**
- Add auto-refresh button (with 5–10s interval option)
- Or automatic polling (background refresh every 5–10s)
- Uses same adapter interface; no UI changes

**Enhancement to OrdersPage.jsx:**
- Already has polling via `useOrders` hook (30s interval)
- Switch data source from `ordersAPI` to `uc4Adapter`
- Polling works immediately with mocks

---

## Step 6: Test & Validate

### Phase 1: Mock Data Validation
1. Test `OrderTracking.jsx`:
   - Search for existing order ID (1001–1005)
   - Verify order details display correctly
   - Verify status timeline renders
   - Verify items, pricing, discount display

2. Test `OrdersPage.jsx`:
   - Page loads and shows all orders
   - Filter by status works
   - Click order → detail page
   - Refresh button works
   - Auto-polling updates (if enabled)

3. Test `updateOrderStatus`:
   - Click "Update Status" in order detail
   - Status updates correctly
   - Invalid transitions rejected
   - Both list and detail update

### Phase 2: Polling Behavior
1. Background polling (every 5–10s):
   - Auto-advance some mock orders
   - Customer page refreshes automatically
   - Ops queue refreshes automatically

2. Manual refresh:
   - Refresh button works
   - Loading state displays
   - Data updates

### Phase 3: Error Handling
1. Test "Order not found":
   - Search for invalid order ID (999)
   - Error message displays
   - Can try again

2. Test status validation:
   - Try invalid transition (e.g., pending → delivered)
   - Error message displays
   - Order state unchanged

---

## Files to Create

```
frontend/src/
├── adapters/
│   └── uc4-adapter.js              [NEW] Data source interface + implementation
├── services/
│   └── mockOrdersService.js        [NEW] Mock data + state management
├── pages/
│   ├── OrderTracking.jsx           [MODIFY] Replace ordersAPI import
│   └── OrdersPage.jsx              [MODIFY] Replace ordersAPI import
├── hooks/
│   └── useOrders.js                [MODIFY] Replace ordersAPI import
└── api/
    └── orders.js                   [NO CHANGE] Kept for real API later
```

---

## Files to MODIFY (Minimal Changes)

### OrderTracking.jsx
```javascript
// OLD:
import { ordersAPI } from '../api/orders'

// NEW:
import { uc4Adapter } from '../adapters/uc4-adapter'

// OLD:
const response = await ordersAPI.getById(orderId)

// NEW:
const response = await uc4Adapter.getOrderById(orderId)
```

**No other changes.** Same interface; UI logic unchanged.

### OrdersPage.jsx
```javascript
// OLD:
import ordersAPI from '../api/orders'
const { orders, loading, error, refetch } = useOrders(30000, statusFilter)

// NEW:
// No changes to this file; changes happen in useOrders.js instead
```

### useOrders.js
```javascript
// OLD:
import ordersAPI from '../api/orders'
const data = await ordersAPI.getAll(params)

// NEW:
import { uc4Adapter } from '../adapters/uc4-adapter'
const data = await uc4Adapter.getAllOrders(params)
```

**No logic changes.** Just different data source.

---

## Transition to Real Backend (Phase X)

When UC1–3 are ready and backend endpoints are live:

1. Create `frontend/src/adapters/uc4-real-adapter.js`:
   ```javascript
   import { ordersAPI } from '../api/orders'
   
   export const uc4RealAdapter = {
     async getOrderById(orderId) {
       return await ordersAPI.getById(orderId)
     },
     // ... other methods
   }
   ```

2. Switch adapter in one place (e.g., `main.jsx` or config):
   ```javascript
   // OLD:
   import { uc4Adapter as dataAdapter } from './adapters/uc4-adapter'
   
   // NEW:
   import { uc4RealAdapter as dataAdapter } from './adapters/uc4-real-adapter'
   ```

3. Or: Use environment variable:
   ```javascript
   const adapter = process.env.REACT_APP_USE_MOCK === 'true'
     ? uc4MockAdapter
     : uc4RealAdapter
   ```

4. Zero UI component changes. Just swap adapter implementation.

---

## Implementation Checklist

- [ ] Step 1: Create `frontend/src/adapters/uc4-adapter.js` (interface + mock impl)
- [ ] Step 2: Create `frontend/src/services/mockOrdersService.js` (mock data)
- [ ] Step 3: Update `OrderTracking.jsx` (import uc4Adapter)
- [ ] Step 4: Update `useOrders.js` (import uc4Adapter)
- [ ] Step 5: Test order tracking (search, display, polling)
- [ ] Step 6: Test ops queue (list, filter, status update)
- [ ] Step 7: Test error handling (not found, invalid transition)
- [ ] Step 8: Document adapter for later integration with real backend

---

## Summary

**Phase 1 (Now):**
✅ Create mock adapter + service  
✅ Update UI imports  
✅ Test with mocks  

**Phase 2 (Future, after UC1–3):**
✅ Create real adapter  
✅ Swap one import  
✅ Test with real backend  
✅ UI: zero changes  

---

## Notes

- **No backend modifications.** All work is frontend-only.
- **UI decoupled from data.** Swap data sources without touching components.
- **Realistic mock data.** Timestamps, items, pricing, discounts all correct.
- **Polling ready.** Auto-refresh works with mocks; will work with real backend too.
- **Error handling.** Mock adapter validates transitions; real adapter will inherit same logic.
