import { useState, useEffect, useCallback } from 'react'
import ordersAPI from '../api/orders'

export const useOrders = (refreshInterval = 30000, statusFilter = null) => {
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = statusFilter ? { status: statusFilter } : {}
      const data = await ordersAPI.getAll(params)
      const orders = data.items || []
      
      // Sort by created_at descending (most recent first)
      orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      
      setOrders(orders)
    } catch (err) {
      setError(err.message || 'Failed to fetch orders')
      console.error('Orders fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  const fetchOrderById = useCallback(async (orderId) => {
    try {
      const data = await ordersAPI.getById(orderId)
      setSelectedOrder(data)
      return data
    } catch (err) {
      setError(err.message || 'Failed to fetch order details')
      console.error('Order details fetch error:', err)
      return null
    }
  }, [])

  const updateOrderStatus = useCallback(async (orderId, newStatus) => {
    try {
      const updated = await ordersAPI.updateStatus(orderId, newStatus)
      
      // Update in local state
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      )
      
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus })
      }
      
      return true
    } catch (err) {
      setError(err.message || 'Failed to update order status')
      console.error('Status update error:', err)
      return false
    }
  }, [selectedOrder])

  // Auto-refresh orders
  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval, fetchOrders])

  return {
    orders,
    selectedOrder,
    loading,
    error,
    fetchOrderById,
    updateOrderStatus,
    refetch: fetchOrders,
  }
}
