import React from 'react'

function CatalogFilters({ selectedColor, selectedSilhouette, selectedBrand, onColorChange, onSilhouetteChange, onBrandChange, onClearFilters }) {
  const colors = ['Navy', 'Black', 'Red', 'Royal Blue', 'Orange', 'Dark Red', 'Grey', 'Khaki', 'Olive Green', 'Silver', 'Neon Yellow', 'Burgundy']
  const silhouettes = ['9FORTY', '9FIFTY']
  const brands = ['New Era']

  const hasActiveFilters = selectedColor || selectedSilhouette || selectedBrand

  return (
    <div className="w-full lg:w-64 mb-8 lg:mb-0">
      <div className="card p-6 sticky top-24">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">Filters</h3>
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear
            </button>
          )}
        </div>

        {/* Color Filter */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Colour</h4>
          <div className="space-y-2">
            {colors.map(color => (
              <label key={color} className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedColor === color}
                  onChange={() => onColorChange(selectedColor === color ? null : color)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                />
                <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900">
                  {color}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Silhouette Filter */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Silhouette</h4>
          <div className="space-y-2">
            {silhouettes.map(sil => (
              <label key={sil} className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedSilhouette === sil}
                  onChange={() => onSilhouetteChange(selectedSilhouette === sil ? null : sil)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                />
                <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900">
                  {sil}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Brand Filter */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Brand</h4>
          <div className="space-y-2">
            {brands.map(brand => (
              <label key={brand} className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedBrand === brand}
                  onChange={() => onBrandChange(selectedBrand === brand ? null : brand)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                />
                <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900">
                  {brand}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CatalogFilters
