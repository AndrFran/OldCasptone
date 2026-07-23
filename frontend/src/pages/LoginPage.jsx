import { useState } from 'react'
import './LoginPage.css'

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Simple auth validation - in production, this would call an actual auth API
      if (!email || !password) {
        setError('Email and password are required')
        setLoading(false)
        return
      }

      if (!email.includes('@')) {
        setError('Please enter a valid email')
        setLoading(false)
        return
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        setLoading(false)
        return
      }

      // Simulate auth success (in production, verify credentials against backend)
      const userData = {
        email,
        name: email.split('@')[0],
        role: 'ops_manager',
        loginTime: new Date().toISOString(),
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))

      onLogin(userData)
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Vibe Strike</h1>
          <p>Operations Manager Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ops@viberstrike.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className="login-footer">
          <p>Demo credentials:</p>
          <p>Email: ops@example.com | Password: demo1234</p>
        </div>
      </div>
    </div>
  )
}
