# UC4 Adapter Pattern: Design & Future Integration

## The Problem We Solved

Without an adapter layer:
- **UI directly imports API client:** `import { ordersAPI } from '../api/orders'`
- **UI tightly coupled to backend:** Changing backend = changing UI
- **Testing difficult:** Can't test UI without backend running
- **Parallel development blocked:** Frontend waits for backend to be ready

---

## The Solution: Adapter Pattern

**With adapter layer:**
- **UI imports adapter:** `import { uc4Adapter } from '../adapters/uc4-adapter'`
- **Adapter provides interface:** Same methods whether using mock or real backend
- **UI is data-source agnostic:** Works with any implementation
- **Easy testing:** Mock data, then real data, same UI code
- **Parallel development enabled:** Frontend works immediately while backend develops

---

## Architecture Diagram

### Without Adapter (❌ Tightly Coupled)
```
┌────────────────────────┐
│   OrderTracking.jsx    │
│                        │
│  import ordersAPI      │─────────────┐
│  const order =         │             │
│    ordersAPI.getById() │             │
└────────────────────────┘             │
                                       ▼
┌────────────────────────┐    ┌──────────────────┐
│   Cart.jsx             │──>│  API Client      │
│                        │    │  (orders.js)     │
│  import ordersAPI      │    │                  │
│  ordersAPI.getAll()    │    │  Tight coupling! │
└────────────────────────┘    └────────┬─────────┘
                                       │
                                       │ MUST be real backend
                                       │ NO testing without backend
                                       │
                                       ▼
                              ┌──────────────────┐
                              │  Real Backend    │
                              │  (localhost:8000)│
                              └──────────────────┘

PROBLEM:
- Every component imports ordersAPI directly
- If backend unavailable, UI breaks
- Frontend blocked waiting for backend
- Hard to test without backend
```

### With Adapter (✅ Loosely Coupled)
```
┌────────────────────────┐
│   OrderTracking.jsx    │
│                        │
│  import uc4Adapter     │─────────────┐
│  const order =         │             │
│    uc4Adapter.        │             │
│      getOrderById()    │             │
└────────────────────────┘             │
                                       │ Interface
┌────────────────────────┐             │ (same for both)
│   OrdersPage.jsx       │──────────>  │
│                        │             │
│  import uc4Adapter     │             │
│  uc4Adapter.getAll()   │             │
└────────────────────────┘             ▼
                        ┌──────────────────────────┐
                        │  Adapter Interface       │
                        │                          │
                        │  getOrderById(id)        │
                        │  getCustomerOrders(id)   │
                        │  getAllOrders(filters)   │
                        │  updateOrderStatus(...)  │
                        └────────────┬─────────────┘
                                     │
                      ┌──────────────┴──────────────┐
                      │                             │
        ┌─────────────▼──────────────┐  ┌──────────▼──────────────┐
        │  Mock Adapter (NOW)        │  │  Real Adapter (LATER)   │
        │                            │  │                         │
        │ mockOrdersService          │  │ Real API Client         │
        │ In-memory data             │  │ Backend HTTP calls      │
        │ Simulates delays           │  │ Real database           │
        │                            │  │                         │
        │ 10 sample orders           │  │ Actual backend at       │
        │ Status validation          │  │ localhost:8000          │
        └──────────────────────────┘  └─────────────────────────┘

BENEFITS:
- UI doesn't care which adapter is used
- Frontend works IMMEDIATELY with mocks
- Backend can develop independently
- Swap adapter with ONE line change when backend ready
- Testing easier (no network calls needed)
```

---

## Code Example: Parallel Development

### Phase 1: Frontend Development (Now)
```javascript
// OrderTracking.jsx
import { uc4Adapter } from '../adapters/uc4-adapter'

function OrderTracking() {
  const handleSearch = async (orderId) => {
    const order = await uc4Adapter.getOrderById(orderId)
    setOrder(order)
  }
  // ... rest of component
}

// Same code works with MOCK data
// Frontend team develops UI immediately
// No waiting for backend ✅
```

### Phase 2: Backend Development (Parallel)
```python
# backend/api/orders.py
@router.get("/orders/{order_id}")
async def get_order(order_id: int, db: Session = Depends(get_db)):
    order = OrderService.get_order(db, order_id)
    return order

# Backend team implements real endpoints
# No coordination needed with frontend ✅
```

### Phase 3: Integration (After UC1 Ready)
```javascript
// Just swap the adapter import!

// OLD:
import { uc4Adapter } from '../adapters/uc4-adapter'  // ← Mock

// NEW:
import { uc4RealAdapter as uc4Adapter } from '../adapters/uc4-real-adapter'  // ← Real

// OrderTracking.jsx component: UNCHANGED ✅
// Still calls: uc4Adapter.getOrderById(orderId)
// Now hits real backend instead of mock
// UI works perfectly
```

---

## Adapter Interface Contract

Both mock and real adapters MUST implement this interface:

```typescript
interface IOrdersAdapter {
  /**
   * Get single order by ID
   * @returns {Promise<Order>}
   * @throws {Error} "Order not found" if not found
   */
  getOrderById(orderId: number | string): Promise<Order>

  /**
   * Get all orders for a customer
   * @returns {Promise<{items: Order[], total: number}>}
   */
  getCustomerOrders(customerId: number | string): Promise<OrderList>

  /**
   * Get all orders with optional filters
   * @param {Object} filters - { status?, customer_id? }
   * @returns {Promise<{items: Order[], total: number}>}
   */
  getAllOrders(filters?: Object): Promise<OrderList>

  /**
   * Update order status
   * @param {number} orderId
   * @param {string} newStatus
   * @returns {Promise<Order>}
   * @throws {Error} "Invalid status transition" if invalid
   */
  updateOrderStatus(orderId: number | string, newStatus: string): Promise<Order>
}
```

Both implementations return:
- Same data structure
- Same error messages and codes
- Same behavior/semantics
- Compatible Promise-based API

---

## Mock Adapter (Current)

```javascript
// frontend/src/adapters/uc4-adapter.js

export const uc4Adapter = {
  async getOrderById(orderId) {
    // Simulate 100-300ms network delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200))
    
    // Get from mock service
    const order = mockOrdersService.getOrderById(orderId)
    if (!order) throw new Error('Order not found')
    
    return order
  },
  
  // ... other methods
}
```

**Advantages:**
- ✅ Works immediately (no backend needed)
- ✅ Realistic data (10 sample orders)
- ✅ Simulates network delays
- ✅ Validates status transitions
- ✅ In-memory (fast)
- ✅ Easy to modify for testing

**Disadvantages:**
- ❌ Data resets on page reload
- ❌ No real persistence
- ❌ No auth checks
- ❌ Not scalable for production

---

## Real Adapter (Template for Phase 3)

```javascript
// frontend/src/adapters/uc4-real-adapter.js
import { ordersAPI } from '../api/orders'

export const uc4RealAdapter = {
  async getOrderById(orderId) {
    // Call real backend
    const response = await ordersAPI.getById(orderId)
    return response
  },

  async getCustomerOrders(customerId) {
    const response = await ordersAPI.getCustomerOrders(customerId)
    return response
  },

  async getAllOrders(filters = {}) {
    const response = await ordersAPI.getAll(filters)
    return response
  },

  async updateOrderStatus(orderId, newStatus) {
    const response = await ordersAPI.updateStatus(orderId, newStatus)
    return response
  },
}

export default uc4RealAdapter
```

**Advantages:**
- ✅ Real data from backend
- ✅ Persistent (database)
- ✅ Auth checks (backend enforces)
- ✅ Scalable
- ✅ Production-ready

**Same interface as mock** → UI code unchanged!

---

## UI Component: Data Source Agnostic

```javascript
// frontend/src/pages/OrderTracking.jsx

import { uc4Adapter } from '../adapters/uc4-adapter'

function OrderTracking() {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSearch = async (orderId) => {
    try {
      setLoading(true)
      setError(null)
      
      // This call works EXACTLY the same whether:
      // - uc4Adapter is mock (returns mock data)
      // - uc4Adapter is real (returns data from backend)
      const order = await uc4Adapter.getOrderById(orderId)
      
      setOrder(order)
    } catch (err) {
      // Same error handling for both
      // Mock: throws "Order not found"
      // Real: backend returns 404 error
      // UI doesn't care which
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Rest of component renders order
  // No changes needed for either adapter!
}

export default OrderTracking
```

**Key Point:** The component doesn't care WHERE the data comes from. It only cares that:
1. The adapter has the right interface
2. The data structure is correct
3. Errors are thrown/handled properly

---

## Swapping Adapters: Three Approaches

### Approach 1: Direct Import Swap (Simple)
```javascript
// OLD (in multiple files):
import { uc4Adapter } from '../adapters/uc4-adapter'

// NEW (in multiple files):
import { uc4RealAdapter as uc4Adapter } from '../adapters/uc4-real-adapter'
```
**Pros:** Simple, clear  
**Cons:** Must update multiple imports

### Approach 2: Configuration File (Flexible)
```javascript
// frontend/src/config/adapters.js
export const uc4Adapter = 
  process.env.REACT_APP_USE_MOCK === 'true'
    ? (await import('../adapters/uc4-adapter')).uc4Adapter
    : (await import('../adapters/uc4-real-adapter')).uc4RealAdapter

// Then import from config:
import { uc4Adapter } from '../config/adapters'
```
**Pros:** Single source of truth, environment-based  
**Cons:** Slightly more complex

### Approach 3: Factory Pattern (Most Flexible)
```javascript
// frontend/src/adapters/index.js
export function createOrdersAdapter(source = 'mock') {
  if (source === 'real') {
    return (await import('./uc4-real-adapter')).uc4RealAdapter
  }
  return (await import('./uc4-adapter')).uc4Adapter
}

// In components:
import { createOrdersAdapter } from '../adapters'
const uc4Adapter = await createOrdersAdapter(
  process.env.REACT_APP_DATA_SOURCE || 'mock'
)
```
**Pros:** Most flexible, can support multiple implementations  
**Cons:** More complex setup

---

## Testing Benefits

With the adapter pattern, testing becomes easier:

### Unit Test: Component Logic (No Network Calls)
```javascript
import { render, screen } from '@testing-library/react'
import OrderTracking from './OrderTracking'

// Mock adapter for testing
const mockAdapter = {
  getOrderById: jest.fn().mockResolvedValue({
    id: 123,
    status: 'pending',
    items: [],
    total: 100,
  })
}

test('displays order when found', async () => {
  // Component uses mock adapter
  // No real API calls
  // Test completes instantly
  // Deterministic results
})
```

### Integration Test: With Real Backend
```javascript
import { render } from '@testing-library/react'
import { uc4RealAdapter } from '../adapters/uc4-real-adapter'

test('integrates with real backend', async () => {
  // Use real adapter
  // Tests against actual backend
  // Can verify E2E behavior
})
```

**Both tests use same component code!**

---

## Migration Checklist: Phase 3 (When Backend Ready)

- [ ] Verify UC1 creates orders correctly
- [ ] Verify orders appear in database
- [ ] Create `frontend/src/adapters/uc4-real-adapter.js`
- [ ] Test real adapter methods individually
- [ ] Update imports in:
  - [ ] `OrderTracking.jsx`
  - [ ] `useOrders.js`
- [ ] Test E2E:
  - [ ] Search by order ID → retrieves from backend
  - [ ] List orders → shows all backend orders
  - [ ] Update status → persists to database
  - [ ] Verify real-time updates
- [ ] Remove or keep mock for development fallback

---

## Summary

**The Adapter Pattern Enables:**

1. ✅ **Parallel Development**
   - Frontend works immediately with mocks
   - Backend develops independently
   - No coordination bottleneck

2. ✅ **Easy Testing**
   - Test UI without backend
   - Mock failures, edge cases
   - Deterministic results

3. ✅ **Clean Integration**
   - One-line import change
   - UI code never touched
   - Zero risk of regression

4. ✅ **Flexibility**
   - Can easily add more adapters (stub, logging, caching, etc.)
   - Support multiple backends if needed
   - Environment-based configuration

5. ✅ **Maintainability**
   - Clear separation of concerns
   - Easy to understand data flow
   - Easy to debug

---

## Next: Real Backend Integration

When UC1–3 are ready:

1. Create `uc4-real-adapter.js` (same interface, different implementation)
2. Swap one import
3. Run tests
4. Everything works

**Zero UI changes. Zero risk.**

---

**Adapter pattern = Professional-grade frontend architecture. 🎯**
