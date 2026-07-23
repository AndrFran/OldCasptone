import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

function OpsDashboardHeader() {
  const navigate = useNavigate()
  const userEmail = localStorage.getItem('user_email') || 'Ops Manager'

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user_type')
    localStorage.removeItem('user_email')
    navigate('/login')
  }

  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="text-2xl font-bold text-white">
              👒 CAPS
            </div>
            <span className="text-sm font-medium text-blue-100">Operations</span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/inventory-dashboard"
              className="text-white hover:text-blue-100 font-medium transition"
            >
              📦 Inventory
            </Link>
            <Link
              to="/ops-dashboard"
              className="text-white hover:text-blue-100 font-medium transition"
            >
              📊 Orders Queue
            </Link>
          </nav>

          {/* Right Side - User Menu & Logout */}
          <div className="flex items-center space-x-4">
            {/* User Profile Dropdown */}
            <div className="flex items-center space-x-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-white">{userEmail}</p>
                <p className="text-xs text-blue-100">Ops Manager</p>
              </div>
              <div className="p-2 rounded-full bg-white bg-opacity-20">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-white rounded hover:bg-blue-50 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default OpsDashboardHeader
