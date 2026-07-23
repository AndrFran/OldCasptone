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
  const [sortBy, setSortBy] = useState('status_urgent')
  const [searchTerm, setSearchTerm] = useState('')
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

  const sortedInventory = [...inventory].sort((a, b) => {
    switch (sortBy) {
      case 'status_urgent':
        return (a.stock < a.low_stock_threshold ? 0 : 1) - (b.stock < b.low_stock_threshold ? 0 : 1)
      case 'stock_asc':
        return a.stock - b.stock
      case 'stock_desc':
        return b.stock - a.stock
      case 'name_asc':
        return a.name.localeCompare(b.name)
      case 'name_desc':
        return b.name.localeCompare(a.name)
      default:
        return 0
    }
  })

  const displayInventory = sortedInventory.filter(item => {
    const matchesSearch = searchTerm === '' ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLowStock = !lowStockOnly || item.stock < item.low_stock_threshold
    return matchesSearch && matchesLowStock
  })

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
      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-8">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-4 px-2 border-b-2 font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              activeTab === 'inventory'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📦 Inventory
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-4 px-2 border-b-2 font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              activeTab === 'orders'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📋 Orders
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-4 px-2 border-b-2 font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              activeTab === 'analytics'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📊 Analytics
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: INVENTORY */}
        {activeTab === 'inventory' && (
          <div>
            <div className="flex gap-4 mb-6">
              {/* Sidebar Filters */}
              <div className="w-56 flex-shrink-0">
                <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase">Search</h3>
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase">Filters</h3>

                    {/* Low Stock Filter */}
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lowStockOnly}
                        onChange={(e) => setLowStockOnly(e.target.checked)}
                        className="mr-3 w-4 h-4 rounded"
                      />
                      <span className="text-sm text-gray-700">Low Stock Only</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1">
                {/* Top Bar */}
                <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex items-center justify-between gap-4">
                  <div className="text-sm text-gray-700 font-medium">
                    <span className="font-bold">{displayInventory.length}</span> products
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Sort by:</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="status_urgent">Urgency: Critical → OK</option>
                      <option value="stock_asc">Stock: Low → High</option>
                      <option value="stock_desc">Stock: High → Low</option>
                      <option value="name_asc">Name: A → Z</option>
                      <option value="name_desc">Name: Z → A</option>
                    </select>
                  </div>
                </div>

                {/* Grid */}
                {displayInventory.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <p className="text-gray-500 text-lg">All products in stock</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayInventory.map(item => {
                      const statusColor = item.stock < item.low_stock_threshold / 2
                        ? 'bg-red-50 border-red-200 text-red-800'
                        : item.stock < item.low_stock_threshold
                        ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                        : 'bg-green-50 border-green-200 text-green-800'
                      const statusText = item.stock < item.low_stock_threshold / 2
                        ? 'Critical'
                        : item.stock < item.low_stock_threshold
                        ? 'Warning'
                        : 'OK'
                      const badgeColor = item.stock < item.low_stock_threshold / 2
                        ? 'bg-red-600'
                        : item.stock < item.low_stock_threshold
                        ? 'bg-yellow-600'
                        : 'bg-green-600'

                      return (
                        <div
                          key={item.id}
                          className={`border rounded-lg p-4 hover:shadow-lg transition-shadow ${statusColor}`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-semibold text-gray-900 line-clamp-2">{item.name}</h3>
                            <span className={`${badgeColor} text-white text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ml-2`}>
                              {statusText}
                            </span>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-700">Stock Level:</span>
                              <span className="font-semibold">{item.stock} / {item.low_stock_threshold}</span>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  item.stock < item.low_stock_threshold / 2
                                    ? 'bg-gradient-to-r from-red-500 to-red-700'
                                    : item.stock < item.low_stock_threshold
                                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-700'
                                    : 'bg-gradient-to-r from-green-500 to-green-700'
                                }`}
                                style={{
                                  width: `${Math.min((item.stock / (item.low_stock_threshold * 2)) * 100, 100)}%`
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ORDERS */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">📋 Order Management</h2>
              <button
                onClick={fetchData}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors duration-200"
              >
                🔄 Refresh
              </button>
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2 mb-6">
              {['all', 'pending', 'confirmed', 'shipped', 'delivered'].map(status => (
                <button
                  key={status}
                  onClick={() => setOrderFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                    orderFilter === status
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                    <tr className="border-b border-gray-200 bg-gray-100">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b border-gray-200">Order ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b border-gray-200">Customer</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900 border-b border-gray-200">Total</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b border-gray-200">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b border-gray-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(order => (
                      <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">#{order.id}</td>
                        <td className="py-3 px-4">{order.customer_email || 'N/A'}</td>
                        <td className="py-3 px-4 text-right font-semibold">${parseFloat(order.total || 0).toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <select
                            value={order.status || 'pending'}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            className={`border rounded px-3 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              order.status === 'pending' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                              order.status === 'confirmed' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                              order.status === 'shipped' ? 'bg-purple-50 border-purple-200 text-purple-800' :
                              'bg-green-50 border-green-200 text-green-800'
                            }`}
                          >
                            <option value="pending">🟡 Pending</option>
                            <option value="confirmed">🔵 Confirmed</option>
                            <option value="shipped">🟣 Shipped</option>
                            <option value="delivered">🟢 Delivered</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-gray-500">
                <p className="text-gray-600 text-sm font-semibold">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{orderStats.total}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400">
                <p className="text-gray-600 text-sm font-semibold">Pending</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{orderStats.pending}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600">
                <p className="text-gray-600 text-sm font-semibold">Confirmed</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{orderStats.confirmed}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-600">
                <p className="text-gray-600 text-sm font-semibold">Shipped</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{orderStats.shipped}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-600">
                <p className="text-gray-600 text-sm font-semibold">Delivered</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{orderStats.delivered}</p>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Order Status Breakdown</h3>
              <div className="space-y-3">
                {[
                  { status: 'Pending', count: orderStats.pending, color: 'bg-yellow-500', percent: orderStats.total ? ((orderStats.pending / orderStats.total) * 100).toFixed(0) : 0 },
                  { status: 'Confirmed', count: orderStats.confirmed, color: 'bg-blue-600', percent: orderStats.total ? ((orderStats.confirmed / orderStats.total) * 100).toFixed(0) : 0 },
                  { status: 'Shipped', count: orderStats.shipped, color: 'bg-purple-600', percent: orderStats.total ? ((orderStats.shipped / orderStats.total) * 100).toFixed(0) : 0 },
                  { status: 'Delivered', count: orderStats.delivered, color: 'bg-green-600', percent: orderStats.total ? ((orderStats.delivered / orderStats.total) * 100).toFixed(0) : 0 }
                ].map(stat => (
                  <div key={stat.status}>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{stat.status}</span>
                      <span className="text-sm text-gray-600">{stat.count} orders ({stat.percent}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
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
