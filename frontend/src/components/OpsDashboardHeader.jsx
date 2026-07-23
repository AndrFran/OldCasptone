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
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="text-2xl font-bold text-gray-900">
              👒 CAPS
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            <span className="text-gray-700 font-medium hover:text-blue-600">Operations</span>
          </nav>

          {/* Right Side - User Menu & Logout */}
          <div className="flex items-center space-x-4">
            {/* User Email */}
            <div className="hidden sm:block text-right">
              <p className="text-sm text-gray-700">{userEmail}</p>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200"
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
