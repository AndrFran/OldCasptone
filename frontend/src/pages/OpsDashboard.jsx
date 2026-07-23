import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

function OpsDashboard() {
  const [activeTab, setActiveTab] = useState('inventory')
  const [inventory, setInventory] = useState([])
  const [orders, setOrders] = useState([])
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [orderFilter, setOrderFilter] = useState('all')
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userType = localStorage.getItem('user_type')

    if (!token || userType !== 'ops_manager') {
      navigate('/login')
      return
    }

    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
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
        `http://localhost:8000/orders/${orderId}/status`,
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

  const filteredOrders = orderFilter === 'all'
    ? orders
    : orders.filter(order => order.status === orderFilter)

  const orderStats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length
  }

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

      {/* Tab Navigation */}
      <div className="bg-white border-b sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 flex gap-8">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-4 px-2 border-b-2 font-medium transition ${
              activeTab === 'inventory'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📦 Inventory (UC3)
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-4 px-2 border-b-2 font-medium transition ${
              activeTab === 'orders'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📋 Orders (UC4)
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-4 px-2 border-b-2 font-medium transition ${
              activeTab === 'analytics'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📊 Analytics
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* TAB 1: INVENTORY */}
        {activeTab === 'inventory' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">📦 Inventory Management</h2>
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
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold">Product</th>
                      <th className="text-left py-3 px-4 font-semibold">Stock</th>
                      <th className="text-left py-3 px-4 font-semibold">Threshold</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayInventory.map(item => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{item.name}</td>
                        <td className="py-3 px-4 font-medium">{item.stock}</td>
                        <td className="py-3 px-4">{item.low_stock_threshold}</td>
                        <td className="py-3 px-4">
                          {item.stock < item.low_stock_threshold ? (
                            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                              Low Stock ⚠️
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                              In Stock ✓
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
        )}

        {/* TAB 2: ORDERS (UC4) */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">📋 Order Management (UC4)</h2>
              <button
                onClick={fetchData}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                🔄 Refresh
              </button>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2 mb-6">
              {['all', 'pending', 'confirmed', 'shipped', 'delivered'].map(status => (
                <button
                  key={status}
                  onClick={() => setOrderFilter(status)}
                  className={`px-4 py-2 rounded font-medium transition ${
                    orderFilter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            {/* Orders Table */}
            {filteredOrders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No orders found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold">Order ID</th>
                      <th className="text-left py-3 px-4 font-semibold">Customer</th>
                      <th className="text-right py-3 px-4 font-semibold">Total</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(order => (
                      <tr key={order.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">#{order.id}</td>
                        <td className="py-3 px-4">{order.customer_email || 'N/A'}</td>
                        <td className="py-3 px-4 text-right font-semibold">${parseFloat(order.total || 0).toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <select
                            value={order.status || 'pending'}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            className={`border rounded px-3 py-1 text-sm font-medium ${
                              order.status === 'pending' ? 'bg-yellow-50 border-yellow-300 text-yellow-800' :
                              order.status === 'confirmed' ? 'bg-blue-50 border-blue-300 text-blue-800' :
                              order.status === 'shipped' ? 'bg-purple-50 border-purple-300 text-purple-800' :
                              'bg-green-50 border-green-300 text-green-800'
                            }`}
                          >
                            <option value="pending">🟡 Pending</option>
                            <option value="confirmed">🔵 Confirmed</option>
                            <option value="shipped">🟣 Shipped</option>
                            <option value="delivered">🟢 Delivered</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-sm text-gray-600 mt-4">Showing {filteredOrders.length} of {orders.length} orders</p>
          </div>
        )}

        {/* TAB 3: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">📊 Order Analytics</h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-5 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-gray-400">
                <p className="text-gray-600 text-sm font-medium">Total Orders</p>
                <p className="text-3xl font-bold mt-2">{orderStats.total}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400">
                <p className="text-gray-600 text-sm font-medium">🟡 Pending</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{orderStats.pending}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-400">
                <p className="text-gray-600 text-sm font-medium">🔵 Confirmed</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{orderStats.confirmed}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-400">
                <p className="text-gray-600 text-sm font-medium">🟣 Shipped</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{orderStats.shipped}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-400">
                <p className="text-gray-600 text-sm font-medium">🟢 Delivered</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{orderStats.delivered}</p>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold mb-4">Order Status Breakdown</h3>
              <div className="space-y-3">
                {[
                  { status: 'Pending', count: orderStats.pending, color: 'bg-yellow-500', percent: orderStats.total ? ((orderStats.pending / orderStats.total) * 100).toFixed(0) : 0 },
                  { status: 'Confirmed', count: orderStats.confirmed, color: 'bg-blue-500', percent: orderStats.total ? ((orderStats.confirmed / orderStats.total) * 100).toFixed(0) : 0 },
                  { status: 'Shipped', count: orderStats.shipped, color: 'bg-purple-500', percent: orderStats.total ? ((orderStats.shipped / orderStats.total) * 100).toFixed(0) : 0 },
                  { status: 'Delivered', count: orderStats.delivered, color: 'bg-green-500', percent: orderStats.total ? ((orderStats.delivered / orderStats.total) * 100).toFixed(0) : 0 }
                ].map(stat => (
                  <div key={stat.status}>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{stat.status}</span>
                      <span className="text-sm text-gray-600">{stat.count} orders ({stat.percent}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`${stat.color} h-2 rounded-full`} style={{ width: `${stat.percent}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OpsDashboard
