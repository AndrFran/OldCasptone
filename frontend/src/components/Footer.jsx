import React from 'react'
import { Link } from 'react-router-dom'

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 mt-12">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-4">⚡ Vibe Strike</h3>
            <p className="text-sm">
              Real-time order and inventory management for modern e-commerce.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition">Products</Link></li>
              <li><a href="#" className="hover:text-white transition">Deals</a></li>
              <li><a href="#" className="hover:text-white transition">Best Sellers</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Customer</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/order-tracking" className="hover:text-white transition">Track Order</Link></li>
              <li><a href="#" className="hover:text-white transition">Returns</a></li>
              <li><Link to="/contact" className="hover:text-white transition">Support</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition">About</a></li>
              <li><a href="#" className="hover:text-white transition">Blog</a></li>
              <li><Link to="/contact" className="hover:text-white transition">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-0">
            <p className="text-sm text-gray-400">
              &copy; 2024 Vibe Strike. All rights reserved.
            </p>
            <div className="flex flex-wrap gap-4 md:gap-6 text-sm justify-center md:justify-end">
              <Link to="/privacy-policy" className="hover:text-white transition">Privacy</Link>
              <Link to="/terms-of-service" className="hover:text-white transition">Terms</Link>
              <Link to="/cookie-policy" className="hover:text-white transition">Cookies</Link>
              <Link to="/data-rights" className="hover:text-white transition">Data Rights</Link>
              <Link to="/contact" className="hover:text-white transition">Contact</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
