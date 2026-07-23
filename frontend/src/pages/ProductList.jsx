import React, { useState, useEffect } from 'react'
import { getProducts } from '../api/products'
import ProductCard from '../components/ProductCard'
import CatalogFilters from '../components/CatalogFilters'
import SortDropdown from '../components/SortDropdown'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

function ProductList({ onAddToCart }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedColor, setSelectedColor] = useState(null)
  const [selectedSilhouette, setSelectedSilhouette] = useState(null)
  const [selectedBrand, setSelectedBrand] = useState(null)
  const [sortBy, setSortBy] = useState('recommended')

  useEffect(() => {
    loadProducts()
  }, [selectedColor, selectedSilhouette, selectedBrand, sortBy])

  const loadProducts = async () => {
    try {
      setLoading(true)
      setError(null)

      const filters = {}
      if (selectedColor) filters.color = selectedColor
      if (selectedSilhouette) filters.silhouette = selectedSilhouette
      if (selectedBrand) filters.brand = selectedBrand
      filters.sort = sortBy

      const response = await getProducts(0, 100, filters)
      setProducts(response.data.items || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load products')
      console.error('Error loading products:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClearFilters = () => {
    setSelectedColor(null)
    setSelectedSilhouette(null)
    setSelectedBrand(null)
    setSortBy('recommended')
  }

  return (
    <div className="py-12">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white mb-12">
        <div className="container py-16">
          <h1 className="text-5xl font-bold mb-4">
            TRUCKER CAPS
          </h1>
          <p className="text-xl text-gray-300">
            Discover our exclusive collection of premium trucker caps from New Era and more
          </p>
        </div>
      </div>

      <div className="container">
        {error && (
          <ErrorMessage
            message={error}
            onDismiss={() => setError(null)}
          />
        )}

        {loading ? (
          <LoadingSpinner message="Loading caps..." />
        ) : (
          <div className="flex gap-8">
            {/* Sidebar Filters */}
            <CatalogFilters
              selectedColor={selectedColor}
              selectedSilhouette={selectedSilhouette}
              selectedBrand={selectedBrand}
              onColorChange={setSelectedColor}
              onSilhouetteChange={setSelectedSilhouette}
              onBrandChange={setSelectedBrand}
              onClearFilters={handleClearFilters}
            />

            {/* Main Content */}
            <div className="flex-1">
              {/* Sort Bar */}
              <div className="mb-8 flex justify-between items-center">
                <div className="text-gray-600">
                  {products.length === 0 ? (
                    <span>No caps found</span>
                  ) : (
                    <span>Showing {products.length} cap{products.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
                <SortDropdown
                  selectedSort={sortBy}
                  onSortChange={setSortBy}
                />
              </div>

              {/* Products Grid */}
              {products.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="w-16 h-16 text-gray-300 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                  <p className="text-gray-500 text-lg mb-4">No caps match your filters</p>
                  <button
                    onClick={handleClearFilters}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={onAddToCart}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductList
