import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { uc4Adapter } from '../adapters/uc4-real-adapter'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui'
import { Button } from '../components/ui'
import { Input } from '../components/ui'
import { Badge } from '../components/ui'

function OrderTracking() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [orderId, setOrderId] = useState(searchParams.get('orderId') || '')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()

    if (!orderId.trim()) {
      setError('Please enter an order ID')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setSearched(true)

      const response = await uc4Adapter.getOrderById(orderId)
      setOrder(response)
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Order not found. Please check the order ID.'
      setError(errorMsg)
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  const statusSteps = ['pending', 'confirmed', 'shipped', 'delivered']

  const getStatusIndex = (status) => {
    return statusSteps.indexOf(status?.toLowerCase())
  }

  const currentStatusIndex = order ? getStatusIndex(order.status) : -1

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'text-yellow-600'
      case 'confirmed':
        return 'text-blue-600'
      case 'shipped':
        return 'text-purple-600'
      case 'delivered':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return '⏳'
      case 'confirmed':
        return '✓'
      case 'shipped':
        return '📦'
      case 'delivered':
        return '✓✓'
      default:
        return '•'
    }
  }

  return (
    <div className="py-12">
      <div className="container max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Track Your Order
          </h1>
          <p className="text-lg text-gray-600">
            Enter your order ID to see the current status and delivery information
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter order ID (e.g., 12345)"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                disabled={loading}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={loading || !orderId.trim()}
                variant="default"
              >
                {loading ? 'Searching...' : 'Track'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <ErrorMessage
            message={error}
            onDismiss={() => setError(null)}
          />
        )}

        {loading && searched && <LoadingSpinner message="Looking up order..." />}

        {order && (
          <div className="space-y-8">
            {/* Order Header */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 uppercase tracking-wide mb-1">Order Number</p>
                    <p className="text-3xl font-bold text-gray-900">#{order.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase tracking-wide mb-1">Ordered On</p>
                    <p className="text-lg text-gray-900">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Order Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute left-6 top-0 bottom-0 w-1 bg-gray-200"></div>

                  {/* Timeline Items */}
                  <div className="space-y-8">
                    {statusSteps.map((status, index) => {
                      const isCompleted = index <= currentStatusIndex
                      const isCurrent = index === currentStatusIndex

                      return (
                        <div key={status} className="relative pl-20">
                          {/* Status Circle */}
                          <div
                            className={`absolute left-0 top-1 w-12 h-12 rounded-full flex items-center justify-center text-2xl border-4 transition-all ${
                              isCompleted
                                ? 'bg-green-100 border-green-400 text-green-600'
                                : isCurrent
                                ? 'bg-blue-100 border-blue-400 text-blue-600 animate-pulse'
                                : 'bg-gray-100 border-gray-300 text-gray-400'
                            }`}
                          >
                            {getStatusIcon(status)}
                          </div>

                          {/* Status Content */}
                          <div>
                            <p className={`font-bold capitalize text-lg ${getStatusColor(status)}`}>
                              {status}
                            </p>
                            <p className="text-gray-600 text-sm mt-1">
                              {status === 'pending' && 'Your order is being processed'}
                              {status === 'confirmed' && 'Your order has been confirmed and is being prepared'}
                              {status === 'shipped' && 'Your order is on its way to you'}
                              {status === 'delivered' && 'Your order has been delivered'}
                            </p>

                            {isCurrent && (
                              <Badge variant="info" className="mt-3">
                                Current Status
                              </Badge>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Details */}
            <Card>
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Items */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
                    <div className="space-y-3">
                      {order.items && order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm py-2 border-b last:border-b-0">
                          <div>
                            <p className="font-medium text-gray-900">Product #{item.product_id}</p>
                            <p className="text-gray-600">Quantity: {item.quantity}</p>
                          </div>
                          <p className="font-semibold text-gray-900">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="text-gray-900 font-medium">
                          ${parseFloat(order.subtotal || 0).toFixed(2)}
                        </span>
                      </div>
                      {order.discount_amount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount ({order.coupon_code})</span>
                          <span className="font-medium">
                            -${parseFloat(order.discount_amount).toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="border-t pt-2 flex justify-between">
                        <span className="font-bold text-gray-900">Total</span>
                        <span className="text-lg font-bold text-blue-600">
                          ${parseFloat(order.total || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Estimated Delivery */}
                  {order.status?.toLowerCase() !== 'delivered' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <span className="font-semibold">Estimated Delivery:</span>
                        <br />
                        {new Date(new Date(order.created_at).getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}

                  {order.status?.toLowerCase() === 'delivered' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-800">
                        <span className="font-semibold">✓ Delivered On:</span>
                        <br />
                        {new Date(order.updated_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Support Section */}
            <Card className="bg-gray-50">
              <CardContent className="pt-6">
                <h3 className="font-bold text-gray-900 mb-3">Need Help?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  If you have any questions about your order, please contact our customer support team.
                </p>
                <Button variant="default">
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {!order && searched && !loading && !error && (
          <div className="text-center py-12">
            <svg
              className="w-24 h-24 text-gray-300 mx-auto mb-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="text-gray-500 text-lg">Order not found</p>
            <p className="text-gray-400 text-sm mt-2">Please check the order ID and try again</p>
          </div>
        )}

        {!searched && (
          <div className="text-center py-12 text-gray-500">
            <svg
              className="w-24 h-24 text-gray-300 mx-auto mb-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p>Enter your order ID above to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default OrderTracking
