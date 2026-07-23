import './OrderQueue.css'

export default function OrderQueue({ orders, loading, onOrderSelect }) {
  const getStatusColor = (status) => {
    const colors = {
      pending: '#ff9800',
      confirmed: '#2196f3',
      shipped: '#9c27b0',
      delivered: '#4caf50',
    }
    return colors[status] || '#999'
  }

  if (loading) {
    return (
      <div className="order-queue">
        <div className="loading">Loading orders...</div>
      </div>
    )
  }

  return (
    <div className="order-queue">
      <h3>Order Queue</h3>

      {orders.length === 0 ? (
        <div className="empty-state">
          <p>No orders found</p>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map(order => (
            <div
              key={order.id}
              className="order-card"
              onClick={() => onOrderSelect(order.id)}
              role="button"
              tabIndex={0}
            >
              <div className="order-header">
                <div>
                  <h4 className="order-id">Order #{order.id}</h4>
                  <p className="order-customer">
                    Customer ID: {order.customer_id}
                  </p>
                </div>
                <span
                  className="order-status-badge"
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  {order.status.toUpperCase()}
                </span>
              </div>

              <div className="order-body">
                <div className="order-info">
                  <p className="info-item">
                    <span className="label">Total:</span>
                    <span className="value">${parseFloat(order.total).toFixed(2)}</span>
                  </p>
                  {order.discount_amount > 0 && (
                    <p className="info-item discount">
                      <span className="label">Discount:</span>
                      <span className="value">-${parseFloat(order.discount_amount).toFixed(2)}</span>
                    </p>
                  )}
                  <p className="info-item">
                    <span className="label">Items:</span>
                    <span className="value">{order.items?.length || 0}</span>
                  </p>
                </div>

                <div className="order-timestamp">
                  <p>{new Date(order.created_at).toLocaleDateString()}</p>
                  <p className="time">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              <div className="order-footer">
                <button className="view-button">View Details →</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
