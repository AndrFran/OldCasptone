/**
 * Mock Orders Service
 *
 * Provides realistic mock order data for UC4 frontend development.
 * Completely decoupled from backend—can be swapped with real service later.
 *
 * Features:
 * - 10 sample orders with varied statuses
 * - Realistic pricing, items, discounts
 * - Status transition validation
 * - In-memory state (persists during session)
 * - Simulates API response format
 */

// Sample mock orders—realistic data
const initialMockOrders = [
  {
    id: 1001,
    customer_id: 1,
    status: 'delivered',
    items: [
      { product_id: 1, product_name: 'Widget A', quantity: 2, price: 29.99, subtotal: 59.98 },
    ],
    subtotal: 59.98,
    discount_amount: 0,
    coupon_code: null,
    total: 59.98,
    created_at: '2026-07-20T10:05:00Z',
    updated_at: '2026-07-22T14:30:00Z',
  },
  {
    id: 1002,
    customer_id: 2,
    status: 'shipped',
    items: [
      { product_id: 2, product_name: 'Widget B', quantity: 1, price: 49.99, subtotal: 49.99 },
      { product_id: 3, product_name: 'Widget C', quantity: 1, price: 79.99, subtotal: 79.99 },
    ],
    subtotal: 129.98,
    discount_amount: 0,
    coupon_code: null,
    total: 129.98,
    created_at: '2026-07-22T08:15:00Z',
    updated_at: '2026-07-22T12:00:00Z',
  },
  {
    id: 1003,
    customer_id: 1,
    status: 'confirmed',
    items: [
      { product_id: 4, product_name: 'Gadget X', quantity: 1, price: 39.99, subtotal: 39.99 },
    ],
    subtotal: 39.99,
    discount_amount: 4.00,
    coupon_code: 'SUMMER10',
    total: 35.99,
    created_at: '2026-07-23T09:30:00Z',
    updated_at: '2026-07-23T09:30:00Z',
  },
  {
    id: 1004,
    customer_id: 3,
    status: 'pending',
    items: [
      { product_id: 5, product_name: 'Gadget Y', quantity: 1, price: 99.99, subtotal: 99.99 },
      { product_id: 1, product_name: 'Widget A', quantity: 1, price: 29.99, subtotal: 29.99 },
    ],
    subtotal: 129.98,
    discount_amount: 26.00,
    coupon_code: 'WELCOME20',
    total: 103.98,
    created_at: '2026-07-23T11:00:00Z',
    updated_at: '2026-07-23T11:00:00Z',
  },
  {
    id: 1005,
    customer_id: 2,
    status: 'pending',
    items: [
      { product_id: 2, product_name: 'Widget B', quantity: 3, price: 49.99, subtotal: 149.97 },
    ],
    subtotal: 149.97,
    discount_amount: 0,
    coupon_code: null,
    total: 149.97,
    created_at: '2026-07-23T11:45:00Z',
    updated_at: '2026-07-23T11:45:00Z',
  },
  {
    id: 1006,
    customer_id: 1,
    status: 'shipped',
    items: [
      { product_id: 3, product_name: 'Widget C', quantity: 2, price: 79.99, subtotal: 159.98 },
    ],
    subtotal: 159.98,
    discount_amount: 0,
    coupon_code: null,
    total: 159.98,
    created_at: '2026-07-22T14:20:00Z',
    updated_at: '2026-07-23T10:00:00Z',
  },
  {
    id: 1007,
    customer_id: 3,
    status: 'confirmed',
    items: [
      { product_id: 4, product_name: 'Gadget X', quantity: 2, price: 39.99, subtotal: 79.98 },
    ],
    subtotal: 79.98,
    discount_amount: 8.00,
    coupon_code: 'SAVE5',
    total: 71.98,
    created_at: '2026-07-23T08:00:00Z',
    updated_at: '2026-07-23T08:00:00Z',
  },
  {
    id: 1008,
    customer_id: 2,
    status: 'delivered',
    items: [
      { product_id: 1, product_name: 'Widget A', quantity: 5, price: 29.99, subtotal: 149.95 },
    ],
    subtotal: 149.95,
    discount_amount: 0,
    coupon_code: null,
    total: 149.95,
    created_at: '2026-07-18T10:00:00Z',
    updated_at: '2026-07-20T16:30:00Z',
  },
  {
    id: 1009,
    customer_id: 1,
    status: 'pending',
    items: [
      { product_id: 5, product_name: 'Gadget Y', quantity: 1, price: 99.99, subtotal: 99.99 },
    ],
    subtotal: 99.99,
    discount_amount: 0,
    coupon_code: null,
    total: 99.99,
    created_at: '2026-07-23T12:15:00Z',
    updated_at: '2026-07-23T12:15:00Z',
  },
  {
    id: 1010,
    customer_id: 3,
    status: 'shipped',
    items: [
      { product_id: 2, product_name: 'Widget B', quantity: 2, price: 49.99, subtotal: 99.98 },
      { product_id: 3, product_name: 'Widget C', quantity: 1, price: 79.99, subtotal: 79.99 },
    ],
    subtotal: 179.97,
    discount_amount: 18.00,
    coupon_code: 'SUMMER10',
    total: 161.97,
    created_at: '2026-07-21T16:30:00Z',
    updated_at: '2026-07-23T09:15:00Z',
  },
]

// In-memory state (persists during session)
let mockOrdersState = JSON.parse(JSON.stringify(initialMockOrders))

/**
 * Mock Orders Service
 *
 * Implements data access interface:
 * - getOrderById(id)
 * - getOrdersByCustomer(customerId)
 * - getAllOrders(filters)
 * - updateOrderStatus(id, newStatus)
 * - resetToInitialState()
 */
export const mockOrdersService = {
  /**
   * Get a single order by ID
   * @param {number} orderId
   * @returns {Object|null} Order object or null if not found
   */
  getOrderById(orderId) {
    return mockOrdersState.find(order => order.id === parseInt(orderId))
  },

  /**
   * Get all orders for a specific customer
   * @param {number} customerId
   * @returns {Object[]} Array of orders
   */
  getOrdersByCustomer(customerId) {
    return mockOrdersState.filter(order => order.customer_id === parseInt(customerId))
  },

  /**
   * Get all orders with optional status filter
   * @param {Object} filters - Optional filters { status, customerId }
   * @returns {Object[]} Array of orders
   */
  getAllOrders(filters = {}) {
    let results = [...mockOrdersState]

    if (filters.status) {
      results = results.filter(order => order.status === filters.status)
    }

    if (filters.customer_id) {
      results = results.filter(order => order.customer_id === parseInt(filters.customer_id))
    }

    // Return in API response format (items + total)
    return {
      items: results,
      total: results.length,
    }
  },

  /**
   * Update an order's status with validation
   * @param {number} orderId
   * @param {string} newStatus
   * @returns {Object} Updated order
   * @throws {Error} If order not found or invalid transition
   */
  updateOrderStatus(orderId, newStatus) {
    const order = this.getOrderById(orderId)

    if (!order) {
      throw new Error(`Order ${orderId} not found`)
    }

    // Validate status transition
    const validTransitions = {
      pending: ['confirmed'],
      confirmed: ['shipped'],
      shipped: ['delivered'],
      delivered: [],
    }

    if (!validTransitions[order.status]?.includes(newStatus)) {
      throw new Error(
        `Invalid status transition: ${order.status} → ${newStatus}`
      )
    }

    // Update the order
    order.status = newStatus
    order.updated_at = new Date().toISOString()

    return { ...order }
  },

  /**
   * Reset mock state to initial state (for testing)
   */
  resetToInitialState() {
    mockOrdersState = JSON.parse(JSON.stringify(initialMockOrders))
  },

  /**
   * Get current state (for debugging)
   */
  getState() {
    return JSON.parse(JSON.stringify(mockOrdersState))
  },
}

export default mockOrdersService
