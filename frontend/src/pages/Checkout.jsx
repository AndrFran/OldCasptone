import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ordersAPI } from '../api/orders'
import { couponsAPI } from '../api/coupons'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

function Checkout({ items, onOrderCreated }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [couponValidated, setCouponValidated] = useState(null)
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [couponError, setCouponError] = useState(null)

  const subtotal = items.reduce((sum, item) => {
    return sum + (parseFloat(item.price) * item.quantity)
  }, 0)

  const tax = subtotal * 0.08
  let discountAmount = 0

  if (couponValidated) {
    if (couponValidated.discount_type === 'percent') {
      discountAmount = subtotal * (couponValidated.value / 100)
    } else {
      discountAmount = parseFloat(couponValidated.value)
    }
  }

  const total = subtotal + tax - discountAmount

  const handleValidateCoupon = async (e) => {
    e.preventDefault()
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code')
      return
    }

    try {
      setValidatingCoupon(true)
      setCouponError(null)
      const response = await couponsAPI.validate(couponCode)

      if (response.valid) {
        setCouponValidated(response)
      } else {
        setCouponError('Coupon code is invalid or expired')
        setCouponValidated(null)
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to validate coupon'
      setCouponError(errorMsg)
      setCouponValidated(null)
    } finally {
      setValidatingCoupon(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!customerName.trim() || !customerEmail.trim()) {
      setError('Please fill in all required fields')
      return
    }

    if (items.length === 0) {
      setError('Your cart is empty')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Create customer first (in real app, would have proper customer management)
      // For now, we'll use a simple approach
      const customerId = 1 // Simplified - in production, create/auth customer

      const response = await ordersAPI.createOrder(
        customerId,
        items,
        couponValidated ? couponCode : null
      )

      setSuccess(true)
      onOrderCreated(response.id)

      setTimeout(() => {
        navigate(`/order-confirmation/${response.id}`)
      }, 500)
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to create order'
      setError(errorMsg)
      console.error('Order creation error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="py-12">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
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
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Your Cart is Empty
            </h1>
            <p className="text-gray-600 mb-8">
              Add items to your cart before checking out
            </p>
            <Link to="/" className="btn btn-primary">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-12">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2">
              {error && (
                <ErrorMessage
                  message={error}
                  onDismiss={() => setError(null)}
                />
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Customer Information */}
                <div className="card p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Contact Information
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        id="name"
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="input-field"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="input-field"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Coupon Code */}
                <div className="card p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Promotional Code
                  </h2>

                  {couponValidated && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-green-800">
                            {couponValidated.code}
                          </p>
                          <p className="text-sm text-green-700">
                            {couponValidated.discount_type === 'percent'
                              ? `${couponValidated.value}% off`
                              : `$${parseFloat(couponValidated.value).toFixed(2)} off`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCouponValidated(null)
                            setCouponCode('')
                          }}
                          className="text-green-600 hover:text-green-800"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}

                  {couponError && (
                    <ErrorMessage
                      message={couponError}
                      onDismiss={() => setCouponError(null)}
                    />
                  )}

                  {!couponValidated && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Enter coupon code"
                        className="input-field flex-1"
                        disabled={validatingCoupon}
                      />
                      <button
                        type="button"
                        onClick={handleValidateCoupon}
                        disabled={validatingCoupon || !couponCode.trim()}
                        className="btn btn-secondary px-6"
                      >
                        {validatingCoupon ? 'Validating...' : 'Apply'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Order Items Summary */}
                <div className="card p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Order Items
                  </h2>

                  <div className="space-y-3">
                    {items.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {item.name} x {item.quantity}
                        </span>
                        <span className="font-medium text-gray-900">
                          ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn btn-primary py-3 text-lg"
                >
                  {loading ? 'Processing...' : 'Complete Purchase'}
                </button>

                <Link
                  to="/cart"
                  className="w-full btn btn-secondary py-3 text-center block"
                >
                  Back to Cart
                </Link>
              </form>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="card p-6 sticky top-24 space-y-4">
                <h2 className="text-xl font-bold text-gray-900 border-b pb-4">
                  Order Summary
                </h2>

                <div className="space-y-3">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Tax (8%)</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600 font-semibold">
                      <span>Discount</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-700">
                    <span>Shipping</span>
                    <span className="text-green-600 font-semibold">Free</span>
                  </div>
                </div>

                <div className="border-t pt-4 flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ${total.toFixed(2)}
                  </span>
                </div>

                <div className="bg-blue-50 rounded-lg p-3 text-sm text-gray-700">
                  <p className="font-semibold text-blue-900 mb-1">✓ Secure Checkout</p>
                  <p>Your payment information is encrypted and secure</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Checkout
