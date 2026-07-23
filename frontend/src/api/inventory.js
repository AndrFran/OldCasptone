import apiClient from './client'

// Inventory API endpoints
export const inventoryAPI = {
  // Get all inventory items
  getAll: async (params = {}) => {
    const response = await apiClient.get('/inventory', { params })
    return response.data
  },

  // Get low-stock alerts
  getLowStock: async () => {
    const response = await apiClient.get('/inventory/low-stock')
    return response.data
  },

  // Restock a product
  restock: async (productId, quantity) => {
    const response = await apiClient.patch(`/inventory/${productId}`, {
      quantity: parseInt(quantity),
    })
    return response.data
  },
}

export default inventoryAPI
