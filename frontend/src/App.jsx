import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Login from './pages/Login'
import OpsDashboard from './pages/OpsDashboard'
import InventoryDashboard from './pages/InventoryDashboard'
import ProductList from './pages/ProductList'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import OrderTracking from './pages/OrderTracking'
import UserProfile from './pages/UserProfile'

function App() {
  const [cart, setCart] = useState([])
  const [userType, setUserType] = useState(null)

  useEffect(() => {
    const savedUserType = localStorage.getItem('user_type')
    if (savedUserType) setUserType(savedUserType)
  }, [])
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
        {userType !== 'ops_manager' && <Header cartItemCount={cart.length} />}
        <main className="flex-grow">
          <Routes>
            <Route path="/login" element={<Login onLoginSuccess={setUserType} />} />
            <Route path="/ops-dashboard" element={<OpsDashboard />} />
            <Route path="/inventory-dashboard" element={<InventoryDashboard />} />
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
            <Route path="/user" element={<UserProfile />} />
          </Routes>
        </main>
        {userType !== 'ops_manager' && <Footer />}
      </div>
    </Router>
  )
}

export default App
