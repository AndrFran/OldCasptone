import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

function OpsDashboard() {
  const [inventory, setInventory] = useState([])
  const [orders, setOrders] = useState([])
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userType = localStorage.getItem('user_type')

    if (!token || userType !== 'ops_manager') {
      navigate('/login')
      return
    }

    fetchData()
  }, [navigate])

  const fetchData = async () => {
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    try {
      const [inventoryRes, ordersRes] = await Promise.all([
        axios.get('http://localhost:8000/inventory', { headers }),
        axios.get('http://localhost:8000/orders', { headers })
      ])

      setInventory(inventoryRes.data.items || [])
      setOrders(ordersRes.data.items || [])
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user_type')
    navigate('/login')
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    const token = localStorage.getItem('token')
    try {
      await axios.patch(
        `http://localhost:8000/orders/${orderId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchData()
    } catch (err) {
      console.error('Failed to update order:', err)
    }
  }

  const displayInventory = lowStockOnly
    ? inventory.filter(item => item.stock < item.low_stock_threshold)
    : inventory

  if (loading) return <div className="p-4">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Ops Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Inventory Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Inventory Levels</h2>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium">Low Stock Only</span>
            </label>
          </div>

          {displayInventory.length === 0 ? (
            <p className="text-gray-500">All products in stock</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Product</th>
                    <th className="text-left py-2">Current Stock</th>
                    <th className="text-left py-2">Low Stock Threshold</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayInventory.map(item => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">{item.name}</td>
                      <td className="py-3">{item.stock}</td>
                      <td className="py-3">{item.low_stock_threshold}</td>
                      <td className="py-3">
                        {item.stock < item.low_stock_threshold ? (
                          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                            Low Stock ⚠️
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                            In Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Orders Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Order Tracking & Status</h2>
          {orders.length === 0 ? (
            <p className="text-gray-500">No orders yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Order ID</th>
                    <th className="text-left py-2">Customer</th>
                    <th className="text-left py-2">Total</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">#{order.id}</td>
                      <td className="py-3">{order.customer_id}</td>
                      <td className="py-3">${parseFloat(order.total).toFixed(2)}</td>
                      <td className="py-3">
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          className="border rounded px-2 py-1"
                        >
                          <option>pending</option>
                          <option>confirmed</option>
                          <option>shipped</option>
                          <option>delivered</option>
                        </select>
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => {/* Open order details modal */}}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OpsDashboard
