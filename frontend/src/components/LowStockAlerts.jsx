import './LowStockAlerts.css'

export default function LowStockAlerts({ alerts, onRestockClick }) {
  const criticalAlerts = alerts.filter(a => a.urgency === 'CRITICAL')
  const warningAlerts = alerts.filter(a => a.urgency === 'WARNING')

  return (
    <div className="low-stock-alerts">
      <h3>Stock Alerts</h3>

      {alerts.length === 0 ? (
        <div className="no-alerts">
          <p className="no-alerts-text">All items are well-stocked!</p>
          <p className="no-alerts-emoji">✓</p>
        </div>
      ) : (
        <>
          {criticalAlerts.length > 0 && (
            <div className="alerts-group">
              <h4 className="group-title critical-title">
                Critical ({criticalAlerts.length})
              </h4>
              <div className="alerts-list">
                {criticalAlerts.map(alert => (
                  <div key={alert.product_id} className="alert-item critical">
                    <div className="alert-header">
                      <span className="alert-product">{alert.product_name}</span>
                      <span className="alert-id">#{alert.product_id}</span>
                    </div>
                    <div className="alert-details">
                      <p className="alert-stock">
                        Stock: <strong>{alert.stock}</strong> / {alert.low_stock_threshold}
                      </p>
                      <button
                        className="alert-action"
                        onClick={() => onRestockClick(alert.product_id)}
                      >
                        Restock
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {warningAlerts.length > 0 && (
            <div className="alerts-group">
              <h4 className="group-title warning-title">
                Warning ({warningAlerts.length})
              </h4>
              <div className="alerts-list">
                {warningAlerts.map(alert => (
                  <div key={alert.product_id} className="alert-item warning">
                    <div className="alert-header">
                      <span className="alert-product">{alert.product_name}</span>
                      <span className="alert-id">#{alert.product_id}</span>
                    </div>
                    <div className="alert-details">
                      <p className="alert-stock">
                        Stock: <strong>{alert.stock}</strong> / {alert.low_stock_threshold}
                      </p>
                      <button
                        className="alert-action"
                        onClick={() => onRestockClick(alert.product_id)}
                      >
                        Restock
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
