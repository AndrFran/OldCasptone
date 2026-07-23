/**
 * UC4 Real Adapter - Production Backend Integration
 *
 * Provides the same interface as the mock adapter but calls the real backend API.
 * This enables zero-UI-code changes when switching from mock to real data.
 *
 * Usage: Same as mock adapter
 *   import { uc4Adapter } from '../adapters/uc4-real-adapter'
 *   const order = await uc4Adapter.getOrderById(123)
 */

import { ordersAPI } from '../api/orders'

/**
 * UC4 Real Adapter
 * Connects UI to real backend API at localhost:8000
 */
export const uc4Adapter = {
  /**
   * Get a single order by ID from the backend
   *
   * @param {number|string} orderId
   * @returns {Promise<Object>} Order details
   * @throws {Error} If order not found (404) or network error
   */
  async getOrderById(orderId) {
    try {
      const response = await ordersAPI.getById(orderId)
      return response
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Order not found')
      }
      throw error
    }
  },

  /**
   * Get all orders for a specific customer from the backend
   *
   * @param {number|string} customerId
   * @returns {Promise<Object>} {items: Order[], total: number}
   * @throws {Error} If customer not found or network error
   */
  async getCustomerOrders(customerId) {
    try {
      const response = await ordersAPI.getCustomerOrders(customerId)
      return response
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Customer not found')
      }
      throw error
    }
  },

  /**
   * Get all orders from the backend with optional filters
   *
   * @param {Object} filters - Optional {status?, customer_id?}
   * @returns {Promise<Object>} {items: Order[], total: number}
   * @throws {Error} If filter invalid or network error
   */
  async getAllOrders(filters = {}) {
    try {
      const response = await ordersAPI.getAll(filters)
      return response
    } catch (error) {
      if (error.response?.status === 400) {
        throw new Error('Invalid filter parameters')
      }
      throw error
    }
  },

  /**
   * Update an order's status in the backend
   *
   * @param {number|string} orderId
   * @param {string} newStatus - One of: pending, confirmed, shipped, delivered
   * @returns {Promise<Object>} Updated order
   * @throws {Error} If invalid status, transition, or order not found
   */
  async updateOrderStatus(orderId, newStatus) {
    try {
      const response = await ordersAPI.updateStatus(orderId, newStatus)
      return response
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Order not found')
      }
      if (error.response?.status === 400) {
        throw new Error(
          error.response.data?.detail ||
          'Invalid status transition'
        )
      }
      throw error
    }
  },
}

/**
 * Export adapter as default for compatibility
 */
export default uc4Adapter
