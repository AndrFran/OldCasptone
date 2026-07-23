import { useState, useEffect } from 'react'
import './RestockForm.css'

export default function RestockForm({ products, selectedProductId, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    productId: selectedProductId || '',
    quantity: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedProductId) {
      setFormData(prev => ({ ...prev, productId: selectedProductId }))
      setError('')
      setSuccess('')
    }
  }, [selectedProductId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.productId) {
      setError('Please select a product')
      return
    }

    if (!formData.quantity) {
      setError('Please enter a quantity')
      return
    }

    const qty = parseInt(formData.quantity)
    if (isNaN(qty) || qty <= 0) {
      setError('Quantity must be a positive number')
      return
    }

    setLoading(true)
    try {
      const product = products.find(p => p.product_id === parseInt(formData.productId))
      await onSubmit(parseInt(formData.productId), qty)
      setSuccess(`${product?.product_name} restocked with +${qty} units`)
      setFormData({ productId: selectedProductId || '', quantity: '' })
    } catch (err) {
      setError(err.message || 'Restock failed')
    } finally {
      setLoading(false)
    }
  }

  const selectedProduct = products.find(p => p.product_id === parseInt(formData.productId))

  return (
    <div className="restock-form">
      <h3>Restock Product</h3>

      <form onSubmit={handleSubmit} className="form">
        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        <div className="form-group">
          <label htmlFor="product-select">Select Product</label>
          <select
            id="product-select"
            value={formData.productId}
            onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
            disabled={loading}
          >
            <option value="">-- Choose a product --</option>
            {products.map(product => (
              <option key={product.product_id} value={product.product_id}>
                {product.product_name} (Stock: {product.stock})
              </option>
            ))}
          </select>
        </div>

        {selectedProduct && (
          <div className="product-info">
            <p><strong>Current Stock:</strong> {selectedProduct.stock}</p>
            <p><strong>Low Stock Threshold:</strong> {selectedProduct.low_stock_threshold}</p>
            <p><strong>Price:</strong> ${parseFloat(selectedProduct.price).toFixed(2)}</p>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="quantity">Quantity to Add</label>
          <input
            id="quantity"
            type="number"
            min="1"
            step="1"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            placeholder="Enter quantity"
            disabled={loading}
          />
        </div>

        {formData.quantity && selectedProduct && (
          <div className="restock-preview">
            <p><strong>New Stock Level:</strong> {selectedProduct.stock + parseInt(formData.quantity || 0)}</p>
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            className="button primary"
            disabled={loading || !formData.productId || !formData.quantity}
          >
            {loading ? 'Processing...' : 'Restock'}
          </button>
          {selectedProductId && (
            <button
              type="button"
              className="button secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
