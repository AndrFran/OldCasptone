import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './InventoryDashboard.css'

function InventoryDashboard() {
  const [inventory, setInventory] = useState([])
  const [lowStockAlerts, setLowStockAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [restockingId, setRestockingId] = useState(null)
  const [restockQuantity, setRestockQuantity] = useState('')
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const navigate = useNavigate()

  // Check auth on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userType = localStorage.getItem('user_type')

    if (!token || userType !== 'ops_manager') {
      navigate('/login')
      return
    }

    fetchInventoryData()
    const interval = setInterval(fetchInventoryData, 30000) // Auto-refresh every 30 seconds
    return () => clearInterval(interval)
  }, [navigate])

  const fetchInventoryData = async () => {
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    try {
      setLoading(true)
      const [inventoryRes, alertsRes] = await Promise.all([
        axios.get('http://localhost:8000/inventory', { headers }),
        axios.get('http://localhost:8000/inventory/low-stock', { headers })
      ])

      setInventory(inventoryRes.data.items || [])
      setLowStockAlerts(alertsRes.data.items || [])
      setError(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch inventory data')
      console.error('Inventory fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRestockClick = (productId) => {
    setRestockingId(productId)
    setRestockQuantity('')
    setShowRestockModal(true)
  }

  const handleRestockSubmit = async () => {
    if (!restockQuantity || restockQuantity <= 0) {
      setError('Please enter a valid quantity')
      return
    }

    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    try {
      await axios.patch(
        `http://localhost:8000/inventory/${restockingId}`,
        { quantity: parseInt(restockQuantity) },
        { headers }
      )

      setSuccessMessage(`Product restocked successfully with ${restockQuantity} units`)
      setShowRestockModal(false)
      fetchInventoryData()

      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to restock product')
      console.error('Restock error:', err)
    }
  }

  const getStockStatus = (stock, threshold) => {
    if (stock <= threshold / 2) return 'critical'
    if (stock < threshold) return 'warning'
    return 'ok'
  }

  const sortedInventory = [...inventory].sort((a, b) => {
    const statusOrder = { critical: 0, warning: 1, ok: 2 }
    const statusA = getStockStatus(a.stock, a.low_stock_threshold)
    const statusB = getStockStatus(b.stock, b.low_stock_threshold)
    return statusOrder[statusA] - statusOrder[statusB]
  })

  if (loading) {
    return (
      <div className="inventory-dashboard">
        <div className="loading">Loading inventory data...</div>
      </div>
    )
  }

  return (
    <div className="inventory-dashboard">
      <div className="dashboard-header">
        <h1>Inventory Management Dashboard</h1>
        <button className="refresh-btn" onClick={fetchInventoryData}>
          Refresh
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {successMessage && <div className="success-banner">{successMessage}</div>}

      {/* Low-Stock Alerts Section */}
      <section className="alerts-section">
        <h2>Low-Stock Alerts ({lowStockAlerts.length})</h2>
        {lowStockAlerts.length === 0 ? (
          <div className="no-alerts">All inventory levels are healthy</div>
        ) : (
          <div className="alerts-grid">
            {lowStockAlerts.map((alert) => (
              <div key={alert.product_id} className={`alert-card alert-${alert.urgency}`}>
                <div className="alert-header">
                  <h3>{alert.product_name}</h3>
                  <span className={`urgency-badge ${alert.urgency}`}>{alert.urgency.toUpperCase()}</span>
                </div>
                <div className="alert-details">
                  <p>
                    <strong>Current Stock:</strong> {alert.current_stock} / {alert.low_stock_threshold}
                  </p>
                  <button
                    className="restock-btn-small"
                    onClick={() => handleRestockClick(alert.product_id)}
                  >
                    Restock Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Full Inventory Table */}
      <section className="inventory-section">
        <h2>Full Inventory ({inventory.length} products)</h2>
        <div className="inventory-table-wrapper">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Current Stock</th>
                <th>Low Stock Threshold</th>
                <th>Status</th>
                <th>Price</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedInventory.map((item) => {
                const status = getStockStatus(item.stock, item.low_stock_threshold)
                return (
                  <tr key={item.id} className={`status-${status}`}>
                    <td className="product-name">{item.name}</td>
                    <td className="stock-value">{item.stock}</td>
                    <td className="threshold-value">{item.low_stock_threshold}</td>
                    <td>
                      <span className={`status-badge ${status}`}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </td>
                    <td className="price">${item.price?.toFixed(2) || 'N/A'}</td>
                    <td>
                      <button
                        className="restock-btn"
                        onClick={() => handleRestockClick(item.id)}
                      >
                        Restock
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Restock Modal */}
      {showRestockModal && (
        <div className="modal-overlay" onClick={() => setShowRestockModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Restock Product</h3>
            <div className="modal-body">
              <p>
                Product ID: <strong>{restockingId}</strong>
              </p>
              <label>
                Quantity to Add:
                <input
                  type="number"
                  min="1"
                  value={restockQuantity}
                  onChange={(e) => setRestockQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  autoFocus
                />
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowRestockModal(false)}>
                Cancel
              </button>
              <button className="btn-confirm" onClick={handleRestockSubmit}>
                Confirm Restock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryDashboard
