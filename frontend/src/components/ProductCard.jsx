import React from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '../components/ui'
import { Badge } from '../components/ui'
import { Button } from '../components/ui'

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
      <Card className="h-full hover:shadow-lg transition-shadow">
        {/* Image Section with Sale Badge */}
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
              <Badge variant="destructive" className="font-bold text-lg">Out of Stock</Badge>
            </div>
          )}

          {isLowStock && !isOutOfStock && (
            <div className="absolute top-2 right-2">
              <Badge variant="warning">Low Stock</Badge>
            </div>
          )}
        </div>

        <CardContent className="pt-4">
          {/* Brand */}
          {product.brand && (
            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">
              {product.brand}
            </p>
          )}

          {/* Product Name */}
          <h3 className="font-semibold text-lg text-gray-900 line-clamp-2 mb-1">
            {product.name}
          </h3>

          {/* Silhouette/Style */}
          {product.silhouette && (
            <p className="text-sm text-gray-600 mb-2">
              {product.silhouette}
            </p>
          )}

          {/* Description (if no silhouette) */}
          {!product.silhouette && product.description && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {product.description}
            </p>
          )}

          {/* Pricing */}
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
            {product.stock > 0 && !isOutOfStock && (
              <span className="text-sm text-gray-500 ml-auto">
                {product.stock} in stock
              </span>
            )}
          </div>

          {/* Add to Cart Button */}
          <Button
            onClick={handleQuickAdd}
            disabled={isOutOfStock}
            variant={isOutOfStock ? 'secondary' : 'default'}
            className="w-full"
          >
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        </CardContent>
      </Card>
    </Link>
  )
}

export default ProductCard
