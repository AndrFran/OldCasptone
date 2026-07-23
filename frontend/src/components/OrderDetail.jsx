import { useState } from 'react'
import './OrderDetail.css'

export default function OrderDetail({ order, onStatusUpdate }) {
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [statusError, setStatusError] = useState('')

  const getValidNextStatuses = (currentStatus) => {
    const transitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
    }
    return transitions[currentStatus] || []
  }

  const handleStatusUpdate = async (newStatus) => {
    setUpdatingStatus(true)
    setStatusError('')
    try {
      await onStatusUpdate(newStatus)
    } catch (err) {
      setStatusError(err.message || 'Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const validNextStatuses = getValidNextStatuses(order.status)

  return (
    <div className="order-detail">
      <div className="detail-card">
        <div className="card-header">
          <h2>Order Information</h2>
          <span className="status-badge" style={{
            backgroundColor: {
              pending: '#ff9800',
              confirmed: '#2196f3',
              shipped: '#9c27b0',
              delivered: '#4caf50',
            }[order.status]
          }}>
            {order.status.toUpperCase()}
          </span>
        </div>

        <div className="info-grid">
          <div className="info-item">
            <p className="label">Order ID</p>
            <p className="value">{order.id}</p>
          </div>

          <div className="info-item">
            <p className="label">Customer ID</p>
            <p className="value">{order.customer_id}</p>
          </div>

          <div className="info-item">
            <p className="label">Created</p>
            <p className="value">{new Date(order.created_at).toLocaleString()}</p>
          </div>

          <div className="info-item">
            <p className="label">Last Updated</p>
            <p className="value">{new Date(order.updated_at).toLocaleString()}</p>
          </div>

          <div className="info-item">
            <p className="label">Subtotal</p>
            <p className="value">${parseFloat(order.subtotal).toFixed(2)}</p>
          </div>

          {order.discount_amount > 0 && (
            <div className="info-item discount">
              <p className="label">Discount</p>
              <p className="value">-${parseFloat(order.discount_amount).toFixed(2)}</p>
            </div>
          )}

          <div className="info-item total">
            <p className="label">Total</p>
            <p className="value">${parseFloat(order.total).toFixed(2)}</p>
          </div>

          {order.coupon_code && (
            <div className="info-item">
              <p className="label">Coupon Code</p>
              <p className="value">{order.coupon_code}</p>
            </div>
          )}
        </div>
      </div>

      <div className="detail-card">
        <div className="card-header">
          <h2>Order Items ({order.items?.length || 0})</h2>
        </div>

        {!order.items || order.items.length === 0 ? (
          <p className="empty">No items in this order</p>
        ) : (
          <div className="items-table-wrapper">
            <table className="items-table">
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map(item => (
                  <tr key={item.id}>
                    <td>{item.product_id}</td>
                    <td>{item.quantity}</td>
                    <td>${parseFloat(item.price).toFixed(2)}</td>
                    <td>${parseFloat(item.subtotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {validNextStatuses.length > 0 && (
        <div className="detail-card">
          <div className="card-header">
            <h2>Update Status</h2>
          </div>

          {statusError && <div className="error-alert">{statusError}</div>}

          <div className="status-controls">
            {validNextStatuses.map(status => (
              <button
                key={status}
                className={`status-button status-${status}`}
                onClick={() => handleStatusUpdate(status)}
                disabled={updatingStatus}
              >
                {updatingStatus ? 'Updating...' : `Mark as ${status.charAt(0).toUpperCase() + status.slice(1)}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {validNextStatuses.length === 0 && (
        <div className="detail-card">
          <p className="completed">This order cannot be updated further.</p>
        </div>
      )}
    </div>
  )
}
