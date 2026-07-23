import { useState } from 'react'
import { useInventory } from '../hooks/useInventory'
import InventoryOverview from '../components/InventoryOverview'
import LowStockAlerts from '../components/LowStockAlerts'
import RestockForm from '../components/RestockForm'
import './InventoryPage.css'

export default function InventoryPage() {
  const { inventory, lowStockAlerts, loading, error, restock, refetch } = useInventory()
  const [selectedProductForRestock, setSelectedProductForRestock] = useState(null)

  const handleRestockSubmit = async (productId, quantity) => {
    const success = await restock(productId, quantity)
    if (success) {
      setSelectedProductForRestock(null)
    }
  }

  return (
    <div className="inventory-page">
      <div className="page-header">
        <h1>Inventory Management</h1>
        <div className="header-actions">
          <button onClick={refetch} className="refresh-button">
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="error-alert">{error}</div>}

      <div className="inventory-grid">
        {/* Low Stock Alerts Section */}
        <div className="inventory-section alerts-section">
          <LowStockAlerts
            alerts={lowStockAlerts}
            onRestockClick={setSelectedProductForRestock}
          />
        </div>

        {/* Restock Form Section */}
        <div className="inventory-section restock-section">
          <RestockForm
            products={inventory}
            selectedProductId={selectedProductForRestock}
            onSubmit={handleRestockSubmit}
            onCancel={() => setSelectedProductForRestock(null)}
          />
        </div>
      </div>

      {/* Inventory Overview Section */}
      <div className="inventory-section full-width">
        <InventoryOverview inventory={inventory} loading={loading} />
      </div>
    </div>
  )
}
