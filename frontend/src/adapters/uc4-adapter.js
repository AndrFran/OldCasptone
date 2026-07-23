/**
 * UC4 Adapter Layer
 *
 * Provides a clean interface between UI components and data sources.
 * UI components ONLY use this adapter; they never import API clients directly.
 *
 * This design enables easy switching between mock (current) and real (future) backend
 * without modifying a single UI component.
 *
 * Current implementation: Mock service (simulates backend responses)
 * Future implementation: Real API client (when backend is ready)
 */

import mockOrdersService from '../services/mockOrdersService'

/**
 * UC4 Adapter Interface
 *
 * All data sources (mock, real, stub) must implement these methods.
 * Return values match OpenAPI spec exactly.
 */
export const uc4Adapter = {
  /**
   * Get a single order by ID
   *
   * @param {number|string} orderId
   * @returns {Promise<Object>} Order details
   * @throws {Error} If order not found
   *
   * Response format:
   * {
   *   id: 1001,
   *   customer_id: 1,
   *   status: "pending|confirmed|shipped|delivered",
   *   items: [
   *     { product_id, product_name, quantity, price, subtotal }
   *   ],
   *   subtotal: 100.00,
   *   discount_amount: 10.00,
   *   coupon_code: "SUMMER10",
   *   total: 90.00,
   *   created_at: "2026-07-23T10:05:00Z",
   *   updated_at: "2026-07-23T10:05:00Z"
   * }
   */
  async getOrderById(orderId) {
    // Simulate network delay (100–300ms)
    const delay = Math.random() * 200 + 100
    await new Promise(resolve => setTimeout(resolve, delay))

    const order = mockOrdersService.getOrderById(orderId)
    if (!order) {
      const error = new Error('Order not found')
      error.response = { status: 404, data: { error: 'Order not found' } }
      throw error
    }

    return order
  },

  /**
   * Get all orders for a specific customer
   *
   * @param {number|string} customerId
   * @returns {Promise<Object[]>} Array of orders for customer
   * @throws {Error} If customer not found (optional)
   *
   * Response format:
   * {
   *   items: [Order, Order, ...],
   *   total: 5
   * }
   */
  async getCustomerOrders(customerId) {
    const delay = Math.random() * 200 + 100
    await new Promise(resolve => setTimeout(resolve, delay))

    const orders = mockOrdersService.getOrdersByCustomer(customerId)
    return {
      items: orders,
      total: orders.length,
    }
  },

  /**
   * Get all orders (ops queue) with optional filters
   *
   * @param {Object} filters - Optional { status?, customer_id? }
   * @returns {Promise<Object>} List of orders
   *
   * Response format:
   * {
   *   items: [Order, Order, ...],
   *   total: 25
   * }
   */
  async getAllOrders(filters = {}) {
    const delay = Math.random() * 200 + 100
    await new Promise(resolve => setTimeout(resolve, delay))

    return mockOrdersService.getAllOrders(filters)
  },

  /**
   * Update an order's status
   *
   * @param {number|string} orderId
   * @param {string} newStatus - One of: pending, confirmed, shipped, delivered
   * @returns {Promise<Object>} Updated order
   * @throws {Error} If invalid transition or order not found
   *
   * Valid transitions:
   * pending → confirmed
   * confirmed → shipped
   * shipped → delivered
   * delivered → (terminal state, no transitions)
   *
   * Response format: Full order object with updated status and updated_at
   */
  async updateOrderStatus(orderId, newStatus) {
    // Simulate network delay (300–500ms for write operation)
    const delay = Math.random() * 200 + 300
    await new Promise(resolve => setTimeout(resolve, delay))

    // Validate transition before calling service
    const validTransitions = {
      pending: ['confirmed'],
      confirmed: ['shipped'],
      shipped: ['delivered'],
      delivered: [],
    }

    const order = mockOrdersService.getOrderById(orderId)
    if (!order) {
      const error = new Error('Order not found')
      error.response = { status: 404, data: { error: 'Order not found' } }
      throw error
    }

    const currentStatus = order.status
    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      const error = new Error(`Invalid status transition: ${currentStatus} → ${newStatus}`)
      error.response = {
        status: 400,
        data: { error: 'Invalid status transition', code: 'INVALID_TRANSITION' },
      }
      throw error
    }

    return mockOrdersService.updateOrderStatus(orderId, newStatus)
  },
}

/**
 * Export adapter as default
 * UI components import like: import { uc4Adapter } from '../adapters/uc4-adapter'
 */
export default uc4Adapter
