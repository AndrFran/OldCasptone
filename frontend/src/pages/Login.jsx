import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

function Login({ onLoginSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const demoUsers = [
    { email: 'alice@example.com', password: 'password123', type: 'Customer', desc: 'Browse & order' },
    { email: 'bob@example.com', password: 'password123', type: 'Customer', desc: 'Browse & order' },
    { email: 'ops1@example.com', password: 'password123', type: 'Ops Manager', desc: 'Inventory & orders' }
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const quickLogin = (email, password) => {
    setFormData({ email, password })
    handleSubmit(null, email, password)
  }

  const handleSubmit = async (e, email = formData.email, password = formData.password) => {
    if (e) e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await axios.post('http://localhost:8000/auth/login', {
        email,
        password
      })
      const { access_token, user_type } = response.data

      localStorage.setItem('token', access_token)
      localStorage.setItem('user_type', user_type)

      if (onLoginSuccess) onLoginSuccess(user_type)

      if (user_type === 'ops_manager') {
        navigate('/ops-dashboard')
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-center mb-6">Vibe Strike Login</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="alice@example.com"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="password123"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="border-t pt-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Demo Users:</p>
            <div className="space-y-2">
              {demoUsers.map(user => (
                <button
                  key={user.email}
                  onClick={() => quickLogin(user.email, user.password)}
                  disabled={loading}
                  className="w-full text-left p-3 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 text-sm"
                >
                  <div className="font-medium">{user.email}</div>
                  <div className="text-gray-600 text-xs">{user.type} • {user.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
