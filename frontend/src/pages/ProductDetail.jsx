import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProduct } from '../api/products'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

function ProductDetail({ onAddToCart }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [addedToCart, setAddedToCart] = useState(false)

  useEffect(() => {
    loadProduct()
  }, [id])

  const loadProduct = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getProduct(id)
      setProduct(response.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load product')
      console.error('Error loading product:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = () => {
    onAddToCart(product, quantity)
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  const handleBuyNow = () => {
    onAddToCart(product, quantity)
    navigate('/checkout')
  }

  if (loading) {
    return <LoadingSpinner message="Loading product details..." />
  }

  if (error || !product) {
    return (
      <div className="py-12">
        <div className="container">
          <ErrorMessage message={error || 'Product not found'} />
          <button
            onClick={() => navigate('/')}
            className="btn btn-secondary mt-4"
          >
            Back to Products
          </button>
        </div>
      </div>
    )
  }

  const isOutOfStock = product.stock === 0
  const isLowStock = product.stock > 0 && product.stock < (product.low_stock_threshold || 10)

  return (
    <div className="py-12">
      <div className="container">
        <button
          onClick={() => navigate('/')}
          className="text-blue-600 hover:text-blue-800 mb-8 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Products
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg p-12 h-96">
            <div className="text-9xl">📦</div>
          </div>

          {/* Product Info */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-4xl font-bold text-gray-900 flex-1">
                  {product.name}
                </h1>
                {isOutOfStock && (
                  <span className="badge-danger ml-4">Out of Stock</span>
                )}
                {isLowStock && !isOutOfStock && (
                  <span className="badge-warning ml-4">Low Stock</span>
                )}
              </div>

              <div className="flex items-baseline space-x-2 mb-6">
                <span className="text-4xl font-bold text-gray-900">
                  ${parseFloat(product.price).toFixed(2)}
                </span>
                {product.stock > 0 && (
                  <span className="text-gray-500">
                    ({product.stock} available)
                  </span>
                )}
              </div>

              <div className="prose prose-sm max-w-none mb-8">
                <p className="text-gray-600 text-lg leading-relaxed">
                  {product.description || 'No description available'}
                </p>
              </div>

              {/* Stock Status */}
              <div className="bg-gray-50 rounded-lg p-4 mb-8">
                <h3 className="font-semibold text-gray-900 mb-2">Stock Information</h3>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-600">
                    Current Stock: <span className="font-semibold">{product.stock} units</span>
                  </p>
                  <p className="text-gray-600">
                    Low Stock Alert: <span className="font-semibold">{product.low_stock_threshold || 10} units</span>
                  </p>
                  {isLowStock && (
                    <p className="text-orange-600 font-semibold mt-2">
                      Limited availability - order soon!
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Quantity & Actions */}
            {!isOutOfStock && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-4 py-2 text-gray-600 hover:text-gray-900"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 text-center py-2 border-l border-r border-gray-300 outline-none"
                      min="1"
                      max={product.stock}
                    />
                    <button
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      className="px-4 py-2 text-gray-600 hover:text-gray-900"
                    >
                      +
                    </button>
                  </div>
                  {quantity > product.stock && (
                    <p className="text-red-600 text-sm mt-2">
                      Only {product.stock} available
                    </p>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 btn btn-secondary"
                  >
                    {addedToCart ? '✓ Added to Cart' : 'Add to Cart'}
                  </button>
                  <button
                    onClick={handleBuyNow}
                    className="flex-1 btn btn-primary"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            )}

            {isOutOfStock && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center">
                <p className="text-red-800 font-semibold">
                  This product is currently out of stock
                </p>
                <p className="text-red-600 text-sm mt-2">
                  Check back soon or contact customer support
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Product Features */}
        <div className="mt-16 pt-8 border-t">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Why Choose This Product?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-4">🚚</div>
              <h3 className="font-semibold text-gray-900 mb-2">Fast Shipping</h3>
              <p className="text-gray-600">Real-time inventory ensures accurate shipping</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">💯</div>
              <h3 className="font-semibold text-gray-900 mb-2">Quality Guaranteed</h3>
              <p className="text-gray-600">Rigorous quality control on every product</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="font-semibold text-gray-900 mb-2">Secure Checkout</h3>
              <p className="text-gray-600">Safe and encrypted payment processing</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetail
