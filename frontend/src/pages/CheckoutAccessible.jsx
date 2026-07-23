/**
 * CheckoutAccessible.jsx
 *
 * This is a fully accessible version of the Checkout page demonstrating:
 * - Proper form labels and error handling
 * - ARIA attributes for screen readers
 * - Keyboard navigation support
 * - Focus management
 * - Live region updates
 *
 * To use this, gradually integrate the patterns into the existing Checkout.jsx
 */

import React, { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AccessibleFormField } from '../components/AccessibleFormField'
import { AccessibleToast } from '../components/AccessibleToast'
import { ordersAPI } from '../api/orders'
import { couponsAPI } from '../api/coupons'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

function CheckoutAccessible({ items, onOrderCreated }) {
  const navigate = useNavigate()
  const formRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [toast, setToast] = useState(null)

  // Form state
  const storedEmail = localStorage.getItem('email') || ''
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState(storedEmail)
  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')

  // Coupon state
  const [couponCode, setCouponCode] = useState('')
  const [couponValidated, setCouponValidated] = useState(null)
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [couponError, setCouponError] = useState(null)

  // Calculations
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

  // Validation functions
  const validateName = (name) => {
    if (!name.trim()) {
      setNameError('Full name is required')
      return false
    }
    if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters')
      return false
    }
    setNameError('')
    return true
  }

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim()) {
      setEmailError('Email address is required')
      return false
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address')
      return false
    }
    setEmailError('')
    return true
  }

  const handleNameBlur = () => {
    validateName(customerName)
  }

  const handleEmailBlur = () => {
    validateEmail(customerEmail)
  }

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
        setToast({
          message: `Coupon ${response.code} applied successfully!`,
          type: 'success',
        })
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
    setError(null)

    // Validate all fields
    const isNameValid = validateName(customerName)
    const isEmailValid = validateEmail(customerEmail)

    if (!isNameValid || !isEmailValid) {
      setError('Please fix the errors above before submitting')
      // Focus first error field
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus()
      return
    }

    if (items.length === 0) {
      setError('Your cart is empty')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const customerId = 1 // Simplified
      const response = await ordersAPI.createOrder(
        customerId,
        items,
        couponValidated ? couponCode : null
      )

      setSuccess(true)
      onOrderCreated(response.id)

      setToast({
        message: 'Order placed successfully!',
        type: 'success',
      })

      setTimeout(() => {
        navigate(`/order-confirmation/${response.id}`)
      }, 500)
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to create order'
      setError(errorMsg)
      setToast({
        message: errorMsg,
        type: 'error',
      })
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
              aria-hidden="true"
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
                <div
                  className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
                  role="alert"
                  aria-live="assertive"
                >
                  <ErrorMessage
                    message={error}
                    onDismiss={() => setError(null)}
                  />
                </div>
              )}

              <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="space-y-6"
                noValidate
              >
                {/* Customer Information */}
                <div className="card p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Contact Information
                  </h2>

                  <div className="space-y-4">
                    <AccessibleFormField
                      label="Full Name"
                      id="name"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      onBlur={handleNameBlur}
                      required={true}
                      error={nameError}
                      placeholder="John Doe"
                      autoComplete="name"
                    />

                    <AccessibleFormField
                      label="Email Address"
                      id="email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      onBlur={handleEmailBlur}
                      required={true}
                      error={emailError}
                      placeholder="john@example.com"
                      autoComplete="email"
                      helpText="We'll never share your email address"
                    />
                  </div>
                </div>

                {/* Coupon Code */}
                <div className="card p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Promotional Code
                  </h2>

                  {couponValidated && (
                    <div
                      className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4"
                      role="status"
                      aria-live="polite"
                      aria-atomic="true"
                    >
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
                          className="text-green-600 hover:text-green-800 font-medium"
                          aria-label={`Remove coupon ${couponValidated.code}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}

                  {couponError && (
                    <div
                      className="mb-4 p-3 bg-red-50 border border-red-200 rounded"
                      role="alert"
                    >
                      <ErrorMessage
                        message={couponError}
                        onDismiss={() => setCouponError(null)}
                      />
                    </div>
                  )}

                  {!couponValidated && (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label htmlFor="coupon" className="sr-only">
                          Coupon Code
                        </label>
                        <input
                          id="coupon"
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="Enter coupon code"
                          className="input-field"
                          disabled={validatingCoupon}
                          aria-label="Coupon code"
                          aria-describedby="coupon-help"
                        />
                        <p id="coupon-help" className="mt-1 text-sm text-gray-500">
                          Optional: Enter a valid coupon code to apply a discount
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleValidateCoupon}
                        disabled={validatingCoupon || !couponCode.trim()}
                        className="btn btn-secondary px-6 self-start mt-6"
                        aria-busy={validatingCoupon}
                        aria-label={validatingCoupon ? 'Validating coupon' : 'Apply coupon'}
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

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th scope="col" className="text-left py-2 text-gray-700">
                          Product
                        </th>
                        <th scope="col" className="text-center py-2 text-gray-700">
                          Quantity
                        </th>
                        <th scope="col" className="text-right py-2 text-gray-700">
                          Price
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="text-gray-600 py-3">{item.name}</td>
                          <td className="text-center text-gray-600 py-3">
                            {item.quantity}
                          </td>
                          <td className="text-right font-medium text-gray-900 py-3">
                            ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Submit Buttons */}
                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn btn-primary py-3 text-lg"
                    aria-busy={loading}
                  >
                    {loading ? 'Processing...' : 'Complete Purchase'}
                  </button>

                  <Link
                    to="/cart"
                    className="w-full btn btn-secondary py-3 text-center block"
                  >
                    Back to Cart
                  </Link>
                </div>
              </form>
            </div>

            {/* Order Summary Sidebar */}
            <aside className="lg:col-span-1">
              <div className="card p-6 sticky top-24 space-y-4">
                <h2 className="text-xl font-bold text-gray-900 border-b pb-4">
                  Order Summary
                </h2>

                <dl className="space-y-3">
                  <div className="flex justify-between text-gray-700">
                    <dt>Subtotal</dt>
                    <dd>${subtotal.toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <dt>Tax (8%)</dt>
                    <dd>${tax.toFixed(2)}</dd>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600 font-semibold">
                      <dt>Discount</dt>
                      <dd>-${discountAmount.toFixed(2)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-700">
                    <dt>Shipping</dt>
                    <dd className="text-green-600 font-semibold">Free</dd>
                  </div>
                </dl>

                <div className="border-t pt-4 flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ${total.toFixed(2)}
                  </span>
                </div>

                <div className="bg-blue-50 rounded-lg p-3 text-sm text-gray-700">
                  <p className="font-semibold text-blue-900 mb-1">
                    <svg
                      className="inline w-4 h-4 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path d="M5 9V7a2 2 0 012-2h6a2 2 0 012 2v2m-6 0a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-6a2 2 0 00-2-2m-6 0V5a2 2 0 012-2h6a2 2 0 012 2v4m0 0a2 2 0 00-2-2h-4a2 2 0 00-2 2m4-6h.01M7 20h6" />
                    </svg>
                    Secure Checkout
                  </p>
                  <p>Your payment information is encrypted and secure</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <AccessibleToast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
          autoCloseDuration={5000}
        />
      )}
    </div>
  )
}

export default CheckoutAccessible
