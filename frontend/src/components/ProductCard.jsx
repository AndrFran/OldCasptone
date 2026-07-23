import React from 'react'
import { Link } from 'react-router-dom'

function ProductCard({ product, onAddToCart }) {
  const isOutOfStock = product.stock === 0
  const isLowStock = product.stock > 0 && product.stock < (product.low_stock_threshold || 10)
  const hasDiscount = product.sale_price && product.sale_price < product.price

  const handleQuickAdd = (e) => {
    e.preventDefault()
    if (!isOutOfStock) {
      onAddToCart(product, 1)
    }
  }

  return (
    <Link to={`/product/${product.id}`}>
      <div className="card h-full hover:shadow-lg transition-shadow">
        {/* Image Section */}
        <div className="relative h-48 bg-gray-100 rounded-t-lg flex items-center justify-center overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="text-6xl">👒</div>
          )}

          {hasDiscount && (
            <div className="absolute top-2 left-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
              Sale
            </div>
          )}

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
          {product.brand && (
            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">
              {product.brand}
            </p>
          )}

          <h3 className="font-semibold text-lg text-gray-900 line-clamp-2 mb-1">
            {product.name}
          </h3>

          {product.silhouette && (
            <p className="text-sm text-gray-600 mb-2">
              {product.silhouette}
            </p>
          )}

          <div className="flex items-baseline gap-2 mb-4">
            {hasDiscount ? (
              <>
                <span className="text-2xl font-bold text-blue-600">
                  ${parseFloat(product.sale_price).toFixed(2)}
                </span>
                <span className="text-lg text-gray-400 line-through">
                  ${parseFloat(product.price).toFixed(2)}
                </span>
              </>
            ) : (
              <span className="text-2xl font-bold text-gray-900">
                ${parseFloat(product.price).toFixed(2)}
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
