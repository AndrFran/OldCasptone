import apiClient from './client'

export const couponsAPI = {
  // Validate a coupon code
  validate: async (code) => {
    const response = await apiClient.post('/coupons/validate', {
      code
    })
    return response.data
  },

  // Get all active promotions
  getPromotions: async (params = {}) => {
    const response = await apiClient.get('/promotions', { params })
    return response.data
  }
}

export default couponsAPI
