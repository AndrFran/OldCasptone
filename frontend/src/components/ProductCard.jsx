import React from 'react'
import { Link } from 'react-router-dom'

function ProductCard({ product, onAddToCart }) {
  const isOutOfStock = product.stock === 0
  const isLowStock = product.stock > 0 && product.stock < (product.low_stock_threshold || 10)

  const handleQuickAdd = (e) => {
    e.preventDefault()
    if (!isOutOfStock) {
      onAddToCart(product, 1)
    }
  }

  return (
    <Link to={`/product/${product.id}`}>
      <div className="card h-full hover:shadow-lg transition-shadow">
        <div className="relative h-48 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-t-lg flex items-center justify-center overflow-hidden">
          <div className="text-6xl">📦</div>
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="badge-danger font-bold text-lg">Out of Stock</span>
            </div>
          )}
          {isLowStock && !isOutOfStock && (
            <div className="absolute top-2 right-2">
              <span className="badge-warning">Low Stock</span>
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-lg text-gray-900 line-clamp-2 mb-2">
            {product.name}
          </h3>

          {product.description && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {product.description}
            </p>
          )}

          <div className="flex items-baseline justify-between mb-4">
            <span className="text-2xl font-bold text-gray-900">
              ${parseFloat(product.price).toFixed(2)}
            </span>
            {product.stock > 0 && (
              <span className="text-sm text-gray-500">
                {product.stock} in stock
              </span>
            )}
          </div>

          <button
            onClick={handleQuickAdd}
            disabled={isOutOfStock}
            className={`w-full py-2 rounded-lg font-medium transition-colors ${
              isOutOfStock
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'btn-primary hover:bg-blue-700'
            }`}
          >
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </Link>
  )
}

export default ProductCard
