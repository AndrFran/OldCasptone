import { useParams, useNavigate } from 'react-router-dom'
import { useOrders } from '../hooks/useOrders'
import { useEffect, useState } from 'react'
import OrderDetail from '../components/OrderDetail'
import './OrderDetailPage.css'

export default function OrderDetailPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { fetchOrderById, updateOrderStatus } = useOrders()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadOrder = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchOrderById(parseInt(orderId))
        if (data) {
          setOrder(data)
        } else {
          setError('Order not found')
        }
      } catch (err) {
        setError(err.message || 'Failed to load order')
      } finally {
        setLoading(false)
      }
    }

    loadOrder()
  }, [orderId, fetchOrderById])

  const handleStatusUpdate = async (newStatus) => {
    const success = await updateOrderStatus(parseInt(orderId), newStatus)
    if (success) {
      // Reload order to reflect updated status
      const updated = await fetchOrderById(parseInt(orderId))
      if (updated) {
        setOrder(updated)
      }
    }
  }

  return (
    <div className="order-detail-page">
      <div className="page-header">
        <button onClick={() => navigate('/orders')} className="back-button">
          ← Back to Orders
        </button>
        <h1>Order #{orderId}</h1>
      </div>

      {error && <div className="error-alert">{error}</div>}

      {loading ? (
        <div className="loading">Loading order details...</div>
      ) : order ? (
        <OrderDetail order={order} onStatusUpdate={handleStatusUpdate} />
      ) : (
        <div className="not-found">Order not found</div>
      )}
    </div>
  )
}
