import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../api/config'

function UserProfile() {
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancellingId, setCancellingId] = useState(null)
  const [cancelError, setCancelError] = useState('')

  useEffect(() => {
    const email = localStorage.getItem('email')
    const userId = localStorage.getItem('user_id')
    const token = localStorage.getItem('token')

    if (!token || !userId) {
      navigate('/login')
      return
    }

    setUserInfo({ email, userId })
    fetchCustomerOrders(userId, token)
  }, [navigate])

  const fetchCustomerOrders = async (userId, token) => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/orders/customers/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Failed to fetch orders')
      const data = await response.json()
      setOrders(data.items || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return

    try {
      setCancellingId(orderId)
      setCancelError('')
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to cancel order')
      }

      setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o))
    } catch (err) {
      setCancelError(err.message)
    } finally {
      setCancellingId(null)
    }
  }

  const getStatusBadgeColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      confirmed: '✓',
      shipped: '📦',
      delivered: '✅',
      cancelled: '✕',
    }
    return icons[status] || '•'
  }

  const canCancelOrder = (status) => {
    return ['pending', 'confirmed'].includes(status)
  }

  const totalSpent = orders.reduce((sum, order) => sum + Number(order.total), 0)
  const totalSavings = orders.reduce((sum, order) => sum + (Number(order.discount_amount) || 0), 0)

  if (!userInfo) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <h1 className="text-4xl font-bold text-gray-900 mb-8">My Account</h1>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Email Address</p>
              <p className="text-lg font-medium text-gray-900 break-all">{userInfo.email}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Account ID</p>
              <p className="text-lg font-medium text-gray-900 font-mono">{userInfo.userId}</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {!loading && orders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Total Spent</p>
              <p className="text-3xl font-bold text-gray-900">${totalSpent.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Total Savings</p>
              <p className={`text-3xl font-bold ${totalSavings > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                ${totalSavings.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Orders Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-8 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Order History</h2>
          </div>

          {error && (
            <div className="mx-8 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {cancelError && (
            <div className="mx-8 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{cancelError}</p>
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 mb-4">No orders yet</p>
              <a
                href="/"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Start Shopping
              </a>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {orders.map((order) => (
                <div key={order.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">Order #{order.id}</h3>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(order.status)}`}>
                          <span>{getStatusIcon(order.status)}</span>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Order Total</p>
                      <p className="text-2xl font-bold text-gray-900">${Number(order.total).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Items Grid */}
                  <div className="mb-4 bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Items</p>
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <div className="flex-1">
                            <p className="text-gray-900 font-medium">Product {item.product_id}</p>
                            <p className="text-gray-500">Qty: {item.quantity}</p>
                          </div>
                          <p className="text-gray-900 font-medium text-right">${Number(item.price).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Discount & Meta */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-3">
                      {order.coupon_code && (
                        <>
                          <span className="text-sm font-medium text-green-600">
                            Coupon: {order.coupon_code}
                          </span>
                          <span className="text-sm text-green-600">
                            -${Number(order.discount_amount).toFixed(2)}
                          </span>
                        </>
                      )}
                    </div>
                    {canCancelOrder(order.status) && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={cancellingId === order.id}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {cancellingId === order.id ? 'Cancelling...' : 'Cancel Order'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserProfile
