import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import ProductList from './pages/ProductList'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import OrderTracking from './pages/OrderTracking'

function App() {
  const [cart, setCart] = useState([])
  const [lastOrderId, setLastOrderId] = useState(null)

  const addToCart = (product, quantity) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id)
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }
      return [...prevCart, { ...product, quantity }]
    })
  }

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId))
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId)
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.id === productId ? { ...item, quantity } : item
        )
      )
    }
  }

  const clearCart = () => {
    setCart([])
  }

  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header cartItemCount={cart.length} />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<ProductList onAddToCart={addToCart} />} />
            <Route path="/product/:id" element={<ProductDetail onAddToCart={addToCart} />} />
            <Route
              path="/cart"
              element={
                <Cart
                  items={cart}
                  onRemove={removeFromCart}
                  onUpdateQuantity={updateQuantity}
                />
              }
            />
            <Route
              path="/checkout"
              element={
                <Checkout
                  items={cart}
                  onOrderCreated={(orderId) => {
                    setLastOrderId(orderId)
                    clearCart()
                  }}
                />
              }
            />
            <Route
              path="/order-confirmation/:orderId"
              element={<OrderConfirmation />}
            />
            <Route path="/order-tracking" element={<OrderTracking />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App
