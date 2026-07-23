import './InventoryOverview.css'

export default function InventoryOverview({ inventory, loading }) {
  if (loading) {
    return (
      <div className="inventory-overview">
        <h2>All Products</h2>
        <div className="loading">Loading inventory...</div>
      </div>
    )
  }

  const totalValue = inventory.reduce((sum, item) => sum + (item.price * item.stock), 0)

  return (
    <div className="inventory-overview">
      <div className="overview-header">
        <h2>All Products</h2>
        <div className="overview-stats">
          <div className="stat-card">
            <p className="stat-label">Total Items</p>
            <p className="stat-value">{inventory.length}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Total Stock</p>
            <p className="stat-value">{inventory.reduce((sum, item) => sum + item.stock, 0)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Inventory Value</p>
            <p className="stat-value">${totalValue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {inventory.length === 0 ? (
        <div className="empty-state">
          <p>No products found</p>
        </div>
      ) : (
        <div className="inventory-table-wrapper">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Product Name</th>
                <th>Price</th>
                <th>Current Stock</th>
                <th>Threshold</th>
                <th>Status</th>
                <th>Stock Value</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map(item => {
                const stockValue = item.price * item.stock
                const isLow = item.stock < item.low_stock_threshold
                const isCritical = item.stock <= item.low_stock_threshold / 5

                return (
                  <tr key={item.product_id} className={isCritical ? 'critical' : isLow ? 'warning' : ''}>
                    <td className="product-id">{item.product_id}</td>
                    <td className="product-name">{item.product_name}</td>
                    <td className="price">${parseFloat(item.price).toFixed(2)}</td>
                    <td className="stock">{item.stock}</td>
                    <td className="threshold">{item.low_stock_threshold}</td>
                    <td className="status">
                      <span className={`badge ${isCritical ? 'critical' : isLow ? 'warning' : 'normal'}`}>
                        {isCritical ? 'CRITICAL' : isLow ? 'LOW' : 'OK'}
                      </span>
                    </td>
                    <td className="stock-value">${stockValue.toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
