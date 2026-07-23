import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ordersAPI } from '../api/orders'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui'
import { Button } from '../components/ui'

function OrderConfirmation() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadOrder()
  }, [orderId])

  const loadOrder = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load order details
      const orderResponse = await ordersAPI.getById(orderId)
      setOrder(orderResponse)

      // Load recommendations
      try {
        const recsResponse = await ordersAPI.getRecommendations(orderId)
        setRecommendations(recsResponse.recommendations || [])
      } catch (err) {
        console.error('Failed to load recommendations:', err)
        // Don't fail the whole page if recommendations fail
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load order details')
      console.error('Error loading order:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading order confirmation..." />
  }

  if (error || !order) {
    return (
      <div className="py-12">
        <div className="container max-w-2xl">
          <ErrorMessage message={error || 'Order not found'} />
          <Link to="/">
            <Button variant="secondary" className="mt-4">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const estimatedDelivery = new Date()
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 3)

  return (
    <div className="py-12 bg-gradient-to-b from-green-50 to-white">
      <div className="container max-w-3xl">
        {/* Success Message */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <svg className="w-12 h-12 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Order Confirmed!
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Thank you for your purchase. Your order has been received.
          </p>
          <p className="text-gray-500">
            A confirmation email has been sent to your email address.
          </p>
        </div>

        {/* Order Details Card */}
        <Card className="mb-8">
          <CardContent className="pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wide">Order Number</p>
              <p className="text-3xl font-bold text-gray-900">#{order.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wide">Order Date</p>
              <p className="text-lg text-gray-900">
                {new Date(order.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wide">Order Status</p>
              <p className="flex items-center mt-1">
                <span className="inline-block w-3 h-3 bg-yellow-400 rounded-full mr-2"></span>
                <span className="text-lg font-semibold text-gray-900 capitalize">
                  {order.status}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wide">Estimated Delivery</p>
              <p className="text-lg text-gray-900">
                {estimatedDelivery.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          <hr className="my-8" />

          {/* Order Items */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.items && order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.product_id}</p>
                    <p className="text-sm text-gray-600">
                      Quantity: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">
                      ${item.price} each
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <hr className="my-8" />

          {/* Order Total */}
          <div className="space-y-2 text-right">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-900 font-medium">
                ${parseFloat(order.subtotal || 0).toFixed(2)}
              </span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span className="font-medium">
                  -${parseFloat(order.discount_amount).toFixed(2)}
                </span>
              </div>
            )}
            {order.coupon_code && (
              <div className="text-sm text-gray-600 italic">
                Coupon: {order.coupon_code}
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-4">
              <span>Total</span>
              <span className="text-blue-600">
                ${parseFloat(order.total || 0).toFixed(2)}
              </span>
            </div>
          </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-blue-900 mb-3">What's Next?</h3>
          <ul className="space-y-2 text-blue-800 text-sm">
            <li className="flex items-start">
              <span className="text-lg mr-2">📧</span>
              <span>Check your email for order confirmation and tracking updates</span>
            </li>
            <li className="flex items-start">
              <span className="text-lg mr-2">📦</span>
              <span>Your order will be processed and shipped within 24 hours</span>
            </li>
            <li className="flex items-start">
              <span className="text-lg mr-2">📍</span>
              <span>You can track your shipment using the order number above</span>
            </li>
          </ul>
        </div>

        {/* Recommendations Section */}
        {recommendations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">You Might Also Like</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recommendations.slice(0, 3).map((product, idx) => (
                <Card key={idx} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-4">
                    <div className="h-32 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-4xl">📦</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {product.reason}
                    </p>
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-bold text-gray-900">
                        ${parseFloat(product.price).toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500">
                        Stock: {product.stock}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to={`/order-tracking?orderId=${order.id}`}
            className="flex-1"
          >
            <Button variant="default" className="w-full">
              Track Your Order
            </Button>
          </Link>
          <Link
            to="/"
            className="flex-1"
          >
            <Button variant="secondary" className="w-full">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default OrderConfirmation
