import apiClient from './client'

// Orders API endpoints
export const ordersAPI = {
  // List all orders
  getAll: async (params = {}) => {
    const response = await apiClient.get('/orders', { params })
    return response.data
  },

  // Get single order details
  getById: async (orderId) => {
    const response = await apiClient.get(`/orders/${orderId}`)
    return response.data
  },

  // Update order status
  updateStatus: async (orderId, status) => {
    const response = await apiClient.patch(`/orders/${orderId}/status`, {
      status,
    })
    return response.data
  },

  // Get customer orders
  getCustomerOrders: async (customerId, params = {}) => {
    const response = await apiClient.get(`/customers/${customerId}/orders`, { params })
    return response.data
  },

  // Get order recommendations
  getRecommendations: async (orderId) => {
    const response = await apiClient.get(`/orders/${orderId}/recommendations`)
    return response.data
  },

  // Create new order
  createOrder: async (customerId, items, couponCode) => {
    const response = await apiClient.post('/orders', {
      customer_id: customerId,
      items: items.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
      })),
      coupon_code: couponCode,
    })
    return response.data
  },
}

export default ordersAPI
