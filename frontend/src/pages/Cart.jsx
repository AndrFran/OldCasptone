import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

function Cart({ items, onRemove, onUpdateQuantity }) {
  const navigate = useNavigate()

  const subtotal = items.reduce((sum, item) => {
    const salePrice = item.sale_price ? parseFloat(item.sale_price) : null
    const regularPrice = parseFloat(item.price)
    const price = salePrice && salePrice < regularPrice ? salePrice : regularPrice
    return sum + (price * item.quantity)
  }, 0)

  const tax = subtotal * 0.08
  const total = subtotal + tax

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
              Start shopping to add items to your cart
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map(item => (
              <div key={item.id} className="card p-6 flex gap-6">
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">👒</span>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    {item.name}
                  </h3>
                  <div className="text-sm mb-3">
                    {item.sale_price && parseFloat(item.sale_price) < parseFloat(item.price) ? (
                      <>
                        <p className="text-gray-600">
                          Sale Price: <span className="font-semibold text-blue-600">${parseFloat(item.sale_price).toFixed(2)}</span>
                        </p>
                        <p className="text-gray-400 line-through">
                          ${parseFloat(item.price).toFixed(2)}
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-600">
                        Price: ${parseFloat(item.price).toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center border border-gray-300 rounded-lg">
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="px-3 py-1 text-gray-600 hover:text-gray-900"
                      >
                        −
                      </button>
                      <span className="px-4 py-1 border-l border-r border-gray-300">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="px-3 py-1 text-gray-600 hover:text-gray-900"
                      >
                        +
                      </button>
                    </div>

                    <span className="text-lg font-bold text-gray-900">
                      ${((item.sale_price && parseFloat(item.sale_price) < parseFloat(item.price) ? parseFloat(item.sale_price) : parseFloat(item.price)) * item.quantity).toFixed(2)}
                    </span>

                    <button
                      onClick={() => onRemove(item.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
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
                  <span>Estimated Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Shipping</span>
                  <span className="text-green-600 font-semibold">Free</span>
                </div>
              </div>

              <div className="border-t pt-4 flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span className="text-2xl text-blue-600">${total.toFixed(2)}</span>
              </div>

              <Link
                to="/checkout"
                className="w-full btn btn-primary text-center block py-3"
              >
                Proceed to Checkout
              </Link>

              <Link
                to="/"
                className="w-full btn btn-secondary text-center block"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Cart
