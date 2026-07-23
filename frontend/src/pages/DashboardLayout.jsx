import { Outlet, Link, useLocation } from 'react-router-dom'
import './DashboardLayout.css'

export default function DashboardLayout({ user, onLogout }) {
  const location = useLocation()

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div className="dashboard-container">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>Vibe Strike</h2>
          <p>Ops Dashboard</p>
        </div>

        <div className="sidebar-nav">
          <Link
            to="/inventory"
            className={`nav-link ${isActive('/inventory') || location.pathname === '/' ? 'active' : ''}`}
          >
            <span className="nav-icon">📦</span>
            <span>Inventory</span>
          </Link>

          <Link
            to="/orders"
            className={`nav-link ${isActive('/orders') ? 'active' : ''}`}
          >
            <span className="nav-icon">📋</span>
            <span>Orders</span>
          </Link>
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
            <div className="user-details">
              <p className="user-name">{user?.name || 'User'}</p>
              <p className="user-email">{user?.email}</p>
            </div>
          </div>

          <button onClick={onLogout} className="logout-button">
            <span>Logout</span>
          </button>
        </div>
      </nav>

      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  )
}
