import { useState, useEffect, useCallback } from 'react'
import inventoryAPI from '../api/inventory'

export const useInventory = (refreshInterval = 30000) => {
  const [inventory, setInventory] = useState([])
  const [lowStockAlerts, setLowStockAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchInventory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await inventoryAPI.getAll()
      setInventory(data.items || [])
    } catch (err) {
      setError(err.message || 'Failed to fetch inventory')
      console.error('Inventory fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchLowStock = useCallback(async () => {
    try {
      const data = await inventoryAPI.getLowStock()
      setLowStockAlerts(data.items || [])
    } catch (err) {
      console.error('Low stock fetch error:', err)
    }
  }, [])

  const restock = useCallback(async (productId, quantity) => {
    try {
      await inventoryAPI.restock(productId, quantity)
      await fetchInventory() // Refresh inventory after restock
      return true
    } catch (err) {
      setError(err.message || 'Failed to restock product')
      console.error('Restock error:', err)
      return false
    }
  }, [fetchInventory])

  // Auto-refresh inventory and low-stock alerts
  useEffect(() => {
    fetchInventory()
    fetchLowStock()

    const interval = setInterval(() => {
      fetchInventory()
      fetchLowStock()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval, fetchInventory, fetchLowStock])

  return {
    inventory,
    lowStockAlerts,
    loading,
    error,
    restock,
    refetch: fetchInventory,
  }
}
