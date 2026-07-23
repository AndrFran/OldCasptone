import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrders } from '../hooks/useOrders'
import OrderQueue from '../components/OrderQueue'
import OrderStatusFilter from '../components/OrderStatusFilter'
import './OrdersPage.css'

export default function OrdersPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState(null)
  const { orders, loading, error, refetch } = useOrders(30000, statusFilter)

  const handleOrderClick = (orderId) => {
    navigate(`/orders/${orderId}`)
  }

  const filteredOrders = statusFilter
    ? orders.filter(order => order.status === statusFilter)
    : orders

  return (
    <div className="orders-page">
      <div className="page-header">
        <h1>Order Queue</h1>
        <div className="header-actions">
          <button onClick={refetch} className="refresh-button">
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="error-alert">{error}</div>}

      <div className="orders-container">
        <div className="orders-sidebar">
          <OrderStatusFilter
            currentFilter={statusFilter}
            onFilterChange={setStatusFilter}
            orders={orders}
          />
        </div>

        <div className="orders-main">
          <OrderQueue
            orders={filteredOrders}
            loading={loading}
            onOrderSelect={handleOrderClick}
          />
        </div>
      </div>
    </div>
  )
}
