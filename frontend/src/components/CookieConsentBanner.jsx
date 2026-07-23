import React, { useState, useEffect } from 'react'

/**
 * CookieConsentBanner Component
 *
 * GDPR-compliant cookie consent banner with:
 * - Explicit opt-in (no pre-checked boxes)
 * - Cookie preferences modal
 * - Persistent user consent
 * - Clear accept/reject all options
 * - Information about cookie types
 *
 * Usage:
 * <CookieConsentBanner onConsentChange={handleConsentChange} />
 */
export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [consent, setConsent] = useState({
    essential: true, // Always required
    analytics: false,
    marketing: false,
    preferences: false,
  })

  // Load saved consent from localStorage
  useEffect(() => {
    const savedConsent = localStorage.getItem('cookie_consent')
    if (savedConsent) {
      setConsent(JSON.parse(savedConsent))
      setShowBanner(false)
    } else {
      setShowBanner(true)
    }
  }, [])

  const handleAcceptAll = () => {
    const allConsent = {
      essential: true,
      analytics: true,
      marketing: true,
      preferences: true,
    }
    setConsent(allConsent)
    localStorage.setItem('cookie_consent', JSON.stringify(allConsent))
    setShowBanner(false)
    // Trigger analytics, marketing cookies here
    window.dispatchEvent(new CustomEvent('cookieConsent', { detail: allConsent }))
  }

  const handleRejectAll = () => {
    const minimalConsent = {
      essential: true,
      analytics: false,
      marketing: false,
      preferences: false,
    }
    setConsent(minimalConsent)
    localStorage.setItem('cookie_consent', JSON.stringify(minimalConsent))
    setShowBanner(false)
    window.dispatchEvent(new CustomEvent('cookieConsent', { detail: minimalConsent }))
  }

  const handleSavePreferences = () => {
    localStorage.setItem('cookie_consent', JSON.stringify(consent))
    setShowPreferences(false)
    window.dispatchEvent(new CustomEvent('cookieConsent', { detail: consent }))
  }

  const toggleConsent = (key) => {
    if (key === 'essential') return // Essential cannot be toggled
    setConsent(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  if (!showBanner && !showPreferences) return null

  return (
    <>
      {showBanner && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 md:p-6 shadow-lg z-40"
          role="region"
          aria-label="Cookie consent"
        >
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-lg font-semibold mb-2">
                We use cookies to improve your experience
              </h2>
              <p className="text-sm text-gray-300 mb-4">
                We use essential cookies for site functionality, and optional cookies for analytics and marketing to help us improve. You can adjust your preferences at any time.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleRejectAll}
                  className="px-4 py-2 rounded-lg bg-gray-700 text-white font-medium hover:bg-gray-600 transition"
                  aria-label="Reject all optional cookies"
                >
                  Reject All
                </button>
                <button
                  onClick={() => setShowPreferences(true)}
                  className="px-4 py-2 rounded-lg bg-gray-700 text-white font-medium hover:bg-gray-600 transition"
                  aria-label="Customize cookie preferences"
                >
                  Preferences
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
                  aria-label="Accept all cookies"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPreferences && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" role="presentation">
          <div
            className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full"
            role="dialog"
            aria-labelledby="preferences-title"
            aria-modal="true"
          >
            <h2 id="preferences-title" className="text-xl font-bold text-gray-900 mb-4">
              Cookie Preferences
            </h2>

            <div className="space-y-4 mb-6">
              {/* Essential Cookies */}
              <div className="border-b pb-4">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="essential-toggle" className="font-semibold text-gray-900">
                    Essential Cookies
                  </label>
                  <input
                    id="essential-toggle"
                    type="checkbox"
                    checked={true}
                    disabled
                    className="w-4 h-4 cursor-not-allowed"
                    aria-label="Essential cookies (always enabled)"
                  />
                </div>
                <p className="text-sm text-gray-600">
                  Required for site functionality, security, and legal compliance. Cannot be disabled.
                </p>
              </div>

              {/* Analytics Cookies */}
              <div className="border-b pb-4">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="analytics-toggle" className="font-semibold text-gray-900">
                    Analytics Cookies
                  </label>
                  <input
                    id="analytics-toggle"
                    type="checkbox"
                    checked={consent.analytics}
                    onChange={() => toggleConsent('analytics')}
                    className="w-4 h-4"
                    aria-label="Allow analytics cookies"
                  />
                </div>
                <p className="text-sm text-gray-600">
                  Help us understand how you use our site to make improvements.
                </p>
              </div>

              {/* Marketing Cookies */}
              <div className="border-b pb-4">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="marketing-toggle" className="font-semibold text-gray-900">
                    Marketing Cookies
                  </label>
                  <input
                    id="marketing-toggle"
                    type="checkbox"
                    checked={consent.marketing}
                    onChange={() => toggleConsent('marketing')}
                    className="w-4 h-4"
                    aria-label="Allow marketing cookies"
                  />
                </div>
                <p className="text-sm text-gray-600">
                  Enable personalized ads and content recommendations.
                </p>
              </div>

              {/* Preferences Cookies */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="preferences-toggle" className="font-semibold text-gray-900">
                    Preferences Cookies
                  </label>
                  <input
                    id="preferences-toggle"
                    type="checkbox"
                    checked={consent.preferences}
                    onChange={() => toggleConsent('preferences')}
                    className="w-4 h-4"
                    aria-label="Allow preference cookies"
                  />
                </div>
                <p className="text-sm text-gray-600">
                  Remember your preferences like language and theme settings.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRejectAll}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-200 text-gray-900 font-medium hover:bg-gray-300 transition"
                aria-label="Reject all optional cookies"
              >
                Reject All
              </button>
              <button
                onClick={handleSavePreferences}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
                aria-label="Save cookie preferences"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default CookieConsentBanner
