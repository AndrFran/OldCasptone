import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

// ============================= UTILITIES =============================

function getStockStatus(stock, threshold) {
  if (stock <= threshold / 2) return 'critical'
  if (stock < threshold) return 'warning'
  return 'ok'
}

function getStatusColor(status) {
  switch (status) {
    case 'critical':
      return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', badge: 'bg-red-600', light: 'text-red-500' }
    case 'warning':
      return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', badge: 'bg-yellow-600', light: 'text-yellow-500' }
    case 'ok':
      return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', badge: 'bg-green-600', light: 'text-green-500' }
    default:
      return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800', badge: 'bg-gray-600', light: 'text-gray-500' }
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 'critical': return '🔴'
    case 'warning': return '🟡'
    case 'ok': return '🟢'
    default: return '⚪'
  }
}

// ============================= COMPONENTS =============================

/**
 * ProductTableRow Component
 * Displays a single product row in the inventory table
 */
function ProductTableRow({ product, status, colors, onQuantityUpdated }) {
  const [isEditing, setIsEditing] = useState(false)
  const [newQty, setNewQty] = useState(product.stock)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = useCallback(async () => {
    if (newQty === product.stock) {
      setIsEditing(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    try {
      const response = await axios.put(
        `http://localhost:8000/inventory/${product.id}/quantity`,
        { new_quantity: newQty, operation_type: 'set' },
        { headers }
      )
      onQuantityUpdated(response.data)
      setIsEditing(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update')
    } finally {
      setIsLoading(false)
    }
  }, [newQty, product, onQuantityUpdated])

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4">
        <div>
          <p className="text-sm font-medium text-gray-900">{product.name}</p>
          {(product.color || product.silhouette) && (
            <p className="text-xs text-gray-500 mt-1">
              {product.color && `${product.color}`}
              {product.color && product.silhouette && ' • '}
              {product.silhouette && `${product.silhouette}`}
            </p>
          )}
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">{product.brand || product.team || '—'}</td>
      <td className="px-6 py-4 text-center">
        {!isEditing ? (
          <span className="text-sm font-semibold text-gray-900">{product.stock}</span>
        ) : (
          <div className="flex gap-1 items-center justify-center">
            <button
              onClick={() => setNewQty(Math.max(0, newQty - 1))}
              disabled={isLoading}
              className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs font-bold hover:bg-gray-300 disabled:opacity-50"
            >
              −
            </button>
            <input
              type="number"
              min="0"
              max="9999"
              value={newQty}
              onChange={(e) => setNewQty(Math.max(0, parseInt(e.target.value) || 0))}
              disabled={isLoading}
              className="w-12 text-center border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={() => setNewQty(Math.min(9999, newQty + 1))}
              disabled={isLoading}
              className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs font-bold hover:bg-gray-300 disabled:opacity-50"
            >
              +
            </button>
          </div>
        )}
      </td>
      <td className="px-6 py-4 text-center text-sm text-gray-600">{product.low_stock_threshold}</td>
      <td className="px-6 py-4 text-center">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
          {getStatusIcon(status)} {status.toUpperCase()}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleSave}
              disabled={isLoading || newQty === product.stock}
              className="text-sm font-medium text-green-600 hover:text-green-800 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsEditing(false)
                setNewQty(product.stock)
                setError(null)
              }}
              disabled={isLoading}
              className="text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        )}
        {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
      </td>
    </tr>
  )
}

/**
 * ProductCard Component
 * Displays a single product with stock visualization and quantity editor
 */
function ProductCard({ product, onQuantityUpdated }) {
  const [isEditing, setIsEditing] = useState(false)
  const [newQty, setNewQty] = useState(product.stock)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const status = getStockStatus(product.stock, product.low_stock_threshold)
  const colors = getStatusColor(status)
  const stockPercent = Math.min((product.stock / (product.low_stock_threshold * 2)) * 100, 100)

  const handleSave = useCallback(async () => {
    if (newQty === product.stock) {
      setIsEditing(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    try {
      const response = await axios.put(
        `http://localhost:8000/inventory/${product.id}/quantity`,
        { new_quantity: newQty, operation_type: 'set' },
        { headers }
      )

      // Update local state with new data
      onQuantityUpdated(response.data)
      setSuccess(true)

      // Reset UI after 2 seconds
      setTimeout(() => {
        setIsEditing(false)
        setSuccess(false)
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update quantity')
    } finally {
      setIsLoading(false)
    }
  }, [newQty, product, onQuantityUpdated])

  const handleCancel = () => {
    setNewQty(product.stock)
    setIsEditing(false)
    setError(null)
  }

  const handleIncrement = () => {
    setNewQty(Math.min(9999, newQty + 1))
  }

  const handleDecrement = () => {
    setNewQty(Math.max(0, newQty - 1))
  }

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-4 hover:shadow-lg transition-shadow duration-200 flex flex-col h-full`}>
      {/* Header with Image and Status Badge */}
      <div className="relative mb-3 flex-shrink-0">
        <div className="w-full aspect-square bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="text-gray-400 text-5xl">📦</div>
          )}
        </div>
        {/* Status Badge - Top Right */}
        <div className={`absolute top-2 right-2 ${colors.badge} text-white text-xs font-bold px-3 py-1 rounded-full shadow-md`}>
          {status.toUpperCase()}
        </div>
      </div>

      {/* Product Info */}
      <div className="mb-3 flex-shrink-0">
        <h3 className={`font-bold text-gray-900 line-clamp-2 text-sm`}>{product.name}</h3>
        <div className="text-xs text-gray-600 mt-1 space-y-0.5">
          {(product.brand || product.team) && (
            <p className="font-semibold">
              {product.brand && <span>{product.brand}</span>}
              {product.brand && product.team && <span> • </span>}
              {product.team && <span>{product.team}</span>}
            </p>
          )}
          {product.color && (
            <p className="text-gray-500">Color: {product.color}</p>
          )}
          {product.silhouette && (
            <p className="text-gray-500">Silhouette: {product.silhouette}</p>
          )}
        </div>
      </div>

      {/* Stock Progress Bar */}
      <div className="mb-3 flex-shrink-0">
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-bold text-gray-700">Stock Level</label>
          <span className={`text-xs font-bold ${colors.light}`}>
            {product.stock} / {product.low_stock_threshold}
          </span>
        </div>
        <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden shadow-inner">
          <div
            className={`h-full transition-all duration-300 ${
              status === 'critical'
                ? 'bg-gradient-to-r from-red-500 to-red-700'
                : status === 'warning'
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-700'
                : 'bg-gradient-to-r from-green-500 to-green-700'
            }`}
            style={{ width: `${stockPercent}%` }}
          />
        </div>
      </div>

      {/* Price */}
      <div className="mb-3 flex-shrink-0">
        <div className="flex items-baseline gap-1">
          <p className="text-base font-bold text-gray-900">
            ${product.price?.toFixed(2) || 'N/A'}
          </p>
          {product.sale_price && (
            <p className="text-xs text-gray-500 line-through">${product.sale_price?.toFixed(2)}</p>
          )}
        </div>
        {product.sale_price && (
          <p className="text-xs text-green-600 font-semibold">On Sale!</p>
        )}
      </div>

      {/* Quantity Editor */}
      <div className="border-t pt-3">
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Edit Qty
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <button
                onClick={handleDecrement}
                disabled={isLoading}
                className="bg-gray-300 text-gray-800 px-3 py-1 rounded font-bold hover:bg-gray-400 disabled:opacity-50"
              >
                −
              </button>

              <input
                type="number"
                min="0"
                max="9999"
                value={newQty}
                onChange={(e) => setNewQty(Math.max(0, parseInt(e.target.value) || 0))}
                disabled={isLoading}
                className="flex-1 text-center border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />

              <button
                onClick={handleIncrement}
                disabled={isLoading}
                className="bg-gray-300 text-gray-800 px-3 py-1 rounded font-bold hover:bg-gray-400 disabled:opacity-50"
              >
                +
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={isLoading || newQty === product.stock}
                className="flex-1 bg-green-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin">⏳</div>
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </button>

              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1 bg-gray-400 text-white px-3 py-1 rounded text-sm font-medium hover:bg-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
            {success && (
              <p className="text-green-600 text-xs mt-1">✓ Updated to {newQty}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * FilterChip Component
 * Multi-select filter with dropdown
 */
function FilterChip({ label, count, options, selected, onChange, isLoading }) {
  const [showDropdown, setShowDropdown] = useState(false)

  if (!options || options.length === 0) return null

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`px-3 py-2 rounded-full text-sm font-medium border transition-all ${
          selected.length > 0
            ? 'bg-blue-100 border-blue-300 text-blue-800'
            : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
        }`}
        disabled={isLoading}
      >
        {label}
        {selected.length > 0 && (
          <span className="ml-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
            {selected.length}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-40 min-w-48 max-h-64 overflow-y-auto">
          {options.map((option) => (
            <label
              key={option.name}
              className="block px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex items-center gap-2"
            >
              <input
                type="checkbox"
                checked={selected.includes(option.name)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...selected, option.name])
                  } else {
                    onChange(selected.filter((s) => s !== option.name))
                  }
                }}
                className="rounded"
              />
              <span className="flex-1 text-sm text-gray-800">{option.name}</span>
              <span className="text-xs text-gray-500">({option.count})</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * SearchInput Component
 * Debounced search across product fields (name, brand, team, color, silhouette)
 */
function SearchInput({ value, onChange, isLoading }) {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue)
    }, 300) // Debounce 300ms

    return () => clearTimeout(timer)
  }, [localValue, onChange])

  return (
    <div className="relative flex-1 min-w-fit">
      <input
        type="text"
        placeholder="Search by name, brand, team, color, silhouette..."
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        disabled={isLoading}
        className="w-full px-4 py-3 pl-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50 transition-colors"
      />
      <span className="absolute right-3 top-3 text-gray-400 text-lg pointer-events-none">🔍</span>
    </div>
  )
}

/**
 * SortDropdown Component
 */
function SortDropdown({ value, onChange, isLoading }) {
  const sortOptions = [
    { value: 'status_urgent', label: 'Urgency: Critical → OK' },
    { value: 'stock_asc', label: 'Stock: Low → High' },
    { value: 'stock_desc', label: 'Stock: High → Low' },
    { value: 'price_asc', label: 'Price: Low → High' },
    { value: 'price_desc', label: 'Price: High → Low' },
    { value: 'name_asc', label: 'Name: A → Z' },
    { value: 'name_desc', label: 'Name: Z → A' },
    { value: 'updated_at_desc', label: 'Recently Updated' }
  ]

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={isLoading}
      className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 font-medium hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
    >
      <option value="">Sort By...</option>
      {sortOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

/**
 * LowStockAlertBanner Component
 * Shows critical and warning alerts at the top in a horizontal scrollable list
 */
function LowStockAlertBanner({ alerts, onFilterByStatus, isLoading }) {
  if (alerts.length === 0) return null

  const critical = alerts.filter((a) => a.urgency === 'critical')
  const warning = alerts.filter((a) => a.urgency === 'warning')

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-red-900 flex items-center gap-2">
            <span className="text-xl">🔴</span>
            Low-Stock Alerts ({alerts.length} total)
          </h3>
          <p className="text-sm text-red-800 mt-1">
            <strong className="text-red-900">{critical.length}</strong> critical items need immediate action • <strong className="text-yellow-800">{warning.length}</strong> items below threshold
          </p>
        </div>
        <button
          onClick={() => onFilterByStatus('critical')}
          className="bg-red-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex-shrink-0"
          disabled={isLoading}
        >
          View Critical
        </button>
      </div>

      {/* Horizontal scroll of critical and warning items */}
      {(critical.length > 0 || warning.length > 0) && (
        <div className="overflow-x-auto pb-2 -mx-4 px-4">
          <div className="flex gap-2 min-w-min">
            {critical.map((alert) => (
              <div
                key={`critical-${alert.id}`}
                className="flex-shrink-0 bg-white border-2 border-red-400 rounded-lg px-3 py-2 min-w-max shadow-sm hover:shadow-md transition-shadow"
              >
                <p className="text-xs font-bold text-red-900">{alert.name}</p>
                <p className="text-xs text-red-700 font-semibold">Stock: {alert.stock}/{alert.low_stock_threshold}</p>
              </div>
            ))}
            {warning.map((alert) => (
              <div
                key={`warning-${alert.id}`}
                className="flex-shrink-0 bg-white border-2 border-yellow-400 rounded-lg px-3 py-2 min-w-max shadow-sm hover:shadow-md transition-shadow"
              >
                <p className="text-xs font-bold text-yellow-900">{alert.name}</p>
                <p className="text-xs text-yellow-700 font-semibold">Stock: {alert.stock}/{alert.low_stock_threshold}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Main InventoryDashboard Component
 */
function InventoryDashboard() {
  const navigate = useNavigate()

  // Data State
  const [products, setProducts] = useState([])
  const [availableFilters, setAvailableFilters] = useState(null)
  const [lowStockAlerts, setLowStockAlerts] = useState([])

  // Filter & Search State
  const [search, setSearch] = useState('')
  const [brands, setBrands] = useState([])
  const [teams, setTeams] = useState([])
  const [colors, setColors] = useState([])
  const [silhouettes, setSilhouettes] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('status_urgent')

  // Pagination State
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)

  // UI State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)

  // Check auth on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userType = localStorage.getItem('user_type')

    if (!token || userType !== 'ops_manager') {
      navigate('/login')
      return
    }

    fetchAllData()
    const interval = setInterval(fetchAllData, 30000) // Auto-refresh every 30 seconds
    return () => clearInterval(interval)
  }, [navigate])

  // Fetch when filters/search/sort/pagination change
  useEffect(() => {
    if (!loading) {
      fetchInventoryData()
    }
  }, [search, brands, teams, colors, silhouettes, statusFilter, sortBy, page, perPage])

  const fetchAllData = async () => {
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    try {
      setLoading(true)
      const [inventoryRes, filtersRes, alertsRes] = await Promise.all([
        axios.get('http://localhost:8000/inventory', {
          headers,
          params: {
            search: search || undefined,
            brand: brands.length > 0 ? brands : undefined,
            team: teams.length > 0 ? teams : undefined,
            color: colors.length > 0 ? colors : undefined,
            silhouette: silhouettes.length > 0 ? silhouettes : undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            sort_by: sortBy,
            page,
            per_page: perPage
          }
        }),
        axios.get('http://localhost:8000/inventory/filters', { headers }),
        axios.get('http://localhost:8000/inventory/low-stock', { headers })
      ])

      setProducts(inventoryRes.data.items || [])
      setTotalCount(inventoryRes.data.total || 0)
      setAvailableFilters(filtersRes.data)
      setLowStockAlerts(alertsRes.data.items || [])
      setError(null)
      setLastRefresh(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch inventory data')
      console.error('Inventory fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchInventoryData = async () => {
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    try {
      const res = await axios.get('http://localhost:8000/inventory', {
        headers,
        params: {
          search: search || undefined,
          brand: brands.length > 0 ? brands : undefined,
          team: teams.length > 0 ? teams : undefined,
          color: colors.length > 0 ? colors : undefined,
          silhouette: silhouettes.length > 0 ? silhouettes : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          sort_by: sortBy,
          page,
          per_page: perPage
        }
      })

      setProducts(res.data.items || [])
      setTotalCount(res.data.total || 0)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch inventory')
      console.error('Inventory fetch error:', err)
    }
  }

  const handleQuantityUpdated = (response) => {
    // Update the product in the local state
    setProducts((prevProducts) =>
      prevProducts.map((p) =>
        p.id === response.product_id
          ? {
              ...p,
              stock: response.new_quantity,
              urgency: response.urgency,
              updated_at: response.updated_at
            }
          : p
      )
    )

    setSuccessMessage(`Updated ${response.product_name} to ${response.new_quantity} units`)
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const handleClearFilters = () => {
    setSearch('')
    setBrands([])
    setTeams([])
    setColors([])
    setSilhouettes([])
    setStatusFilter('all')
    setPage(1)
  }

  const hasActiveFilters =
    search !== '' ||
    brands.length > 0 ||
    teams.length > 0 ||
    colors.length > 0 ||
    silhouettes.length > 0 ||
    statusFilter !== 'all'

  const totalPages = Math.ceil(totalCount / perPage)

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-800 mb-2">Loading inventory...</div>
          <div className="text-sm text-gray-600">Fetching products, filters, and alerts</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-3xl">📦</span>
              Inventory Management
            </h1>
            <p className="text-blue-100 text-sm mt-1 flex flex-wrap items-center gap-2">
              <span>Real-time Stock Monitoring</span>
              {lastRefresh && <span className="text-blue-200">• Updated: {lastRefresh}</span>}
            </p>
          </div>
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 font-medium transition-colors duration-200 border border-white/20 disabled:opacity-50 whitespace-nowrap flex items-center gap-2"
            title="Refresh all data"
          >
            {loading ? (
              <>
                <span className="inline-block animate-spin">⟳</span>
                Refreshing...
              </>
            ) : (
              <>
                <span>🔄</span>
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-700 hover:text-red-900"
            >
              ✕
            </button>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Low-Stock Alerts Banner */}
        {lowStockAlerts.length > 0 && (
          <LowStockAlertBanner
            alerts={lowStockAlerts}
            onFilterByStatus={setStatusFilter}
            isLoading={loading}
          />
        )}

        {/* Layout: Sidebar + Main Content */}
        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-20 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase">Filters</h3>

                {/* Search */}
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Search</label>
                  <input
                    type="text"
                    placeholder="Product name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>

                {/* Status Filter */}
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Stock Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="all">All Status</option>
                    <option value="critical">🔴 Critical</option>
                    <option value="warning">🟡 Warning</option>
                    <option value="ok">🟢 In Stock</option>
                  </select>
                </div>

                {/* Brand Filter */}
                {availableFilters && availableFilters.brands?.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Brand ({brands.length})</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {availableFilters.brands.map(brand => (
                        <label key={brand.name} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={brands.includes(brand.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBrands([...brands, brand.name])
                              } else {
                                setBrands(brands.filter(b => b !== brand.name))
                              }
                            }}
                            disabled={loading}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-700">{brand.name}</span>
                          <span className="text-xs text-gray-500">({brand.count})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team Filter */}
                {availableFilters && availableFilters.teams?.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Team ({teams.length})</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {availableFilters.teams.map(team => (
                        <label key={team.name} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={teams.includes(team.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTeams([...teams, team.name])
                              } else {
                                setTeams(teams.filter(t => t !== team.name))
                              }
                            }}
                            disabled={loading}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-700">{team.name}</span>
                          <span className="text-xs text-gray-500">({team.count})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Color Filter */}
                {availableFilters && availableFilters.colors?.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Color ({colors.length})</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {availableFilters.colors.map(color => (
                        <label key={color.name} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={colors.includes(color.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setColors([...colors, color.name])
                              } else {
                                setColors(colors.filter(c => c !== color.name))
                              }
                            }}
                            disabled={loading}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-700">{color.name}</span>
                          <span className="text-xs text-gray-500">({color.count})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Silhouette Filter */}
                {availableFilters && availableFilters.silhouettes?.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Silhouette ({silhouettes.length})</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {availableFilters.silhouettes.map(sil => (
                        <label key={sil.name} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={silhouettes.includes(sil.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSilhouettes([...silhouettes, sil.name])
                              } else {
                                setSilhouettes(silhouettes.filter(s => s !== sil.name))
                              }
                            }}
                            disabled={loading}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-700">{sil.name}</span>
                          <span className="text-xs text-gray-500">({sil.count})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="w-full px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                  >
                    ✕ Clear All Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Top Bar: Search and Sort */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex items-center justify-between gap-4">
              <div className="text-sm text-gray-700 font-medium">
                <span className="font-bold">{products.length}</span> of <span className="font-bold">{totalCount}</span> products
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <SortDropdown value={sortBy} onChange={setSortBy} isLoading={loading} />
              </div>
            </div>

        {/* Product Grid */}
        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-700 text-xl font-bold mb-2">No products found</p>
            <p className="text-gray-600 mb-6">Try adjusting your filters or search query</p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Clear Filters & Search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {products.map((product) => {
                const status = getStockStatus(product.stock, product.low_stock_threshold)
                const colors = getStatusColor(status)
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onQuantityUpdated={handleQuantityUpdated}
                  />
                )
              })}
            </div>

            {/* Pagination Controls */}
            <div className="bg-white rounded-lg shadow-md p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-700 whitespace-nowrap">
                Showing <span className="font-semibold">{(page - 1) * perPage + 1}</span>-<span className="font-semibold">{Math.min(page * perPage, totalCount)}</span> of <span className="font-semibold">{totalCount}</span> results
              </div>

              <div className="flex gap-2 items-center flex-wrap justify-center">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1 || loading}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                  title="Previous page"
                >
                  ← Prev
                </button>

                <select
                  value={page}
                  onChange={(e) => setPage(parseInt(e.target.value))}
                  disabled={loading}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium disabled:opacity-50"
                  title="Select page"
                >
                  {Array.from({ length: Math.min(totalPages, 50) }, (_, i) => i + 1).map((p) => (
                    <option key={p} value={p}>
                      Page {p}
                    </option>
                  ))}
                  {totalPages > 50 && (
                    <option value="" disabled>
                      ...
                    </option>
                  )}
                </select>

                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages || loading}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                  title="Next page"
                >
                  Next →
                </button>
              </div>

              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(parseInt(e.target.value))
                  setPage(1)
                }}
                disabled={loading}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                title="Items per page"
              >
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
          </>
        )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default InventoryDashboard
