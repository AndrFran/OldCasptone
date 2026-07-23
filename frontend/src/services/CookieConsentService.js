/**
 * Cookie Consent Service
 *
 * Manages GDPR-compliant cookie consent tracking and enforcement
 * - Stores user consent preferences
 * - Tracks consent history with timestamps
 * - Provides utility functions for checking consent
 * - Integrates with analytics/marketing tools
 */

const CONSENT_STORAGE_KEY = 'cookie_consent'
const CONSENT_TIMESTAMP_KEY = 'cookie_consent_timestamp'
const CONSENT_HISTORY_KEY = 'cookie_consent_history'

export const CookieConsentService = {
  /**
   * Get current consent preferences
   */
  getConsent() {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return this.getDefaultConsent()
      }
    }
    return this.getDefaultConsent()
  },

  /**
   * Get default consent (essential only)
   */
  getDefaultConsent() {
    return {
      essential: true,
      analytics: false,
      marketing: false,
      preferences: false,
    }
  },

  /**
   * Set consent preferences and track history
   */
  setConsent(consentObj) {
    const timestamp = new Date().toISOString()
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentObj))
    localStorage.setItem(CONSENT_TIMESTAMP_KEY, timestamp)

    // Track consent history for audit trail
    this.addToHistory({
      timestamp,
      consent: consentObj,
      source: 'user_action'
    })

    // Dispatch custom event for listeners
    window.dispatchEvent(new CustomEvent('cookieConsentChange', {
      detail: { consent: consentObj, timestamp }
    }))

    // Initialize tracking services based on consent
    this.initializeTracking(consentObj)
  },

  /**
   * Check if specific cookie category is consented
   */
  hasConsent(category) {
    const consent = this.getConsent()
    return consent[category] === true
  },

  /**
   * Check if analytics consent is given
   */
  canUseAnalytics() {
    return this.hasConsent('analytics')
  },

  /**
   * Check if marketing consent is given
   */
  canUseMarketing() {
    return this.hasConsent('marketing')
  },

  /**
   * Check if preference cookies are allowed
   */
  canUsePreferences() {
    return this.hasConsent('preferences')
  },

  /**
   * Get consent timestamp
   */
  getConsentTimestamp() {
    return localStorage.getItem(CONSENT_TIMESTAMP_KEY)
  },

  /**
   * Get consent history for audit trail
   */
  getHistory() {
    const stored = localStorage.getItem(CONSENT_HISTORY_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return []
      }
    }
    return []
  },

  /**
   * Add entry to consent history
   */
  addToHistory(entry) {
    const history = this.getHistory()
    history.push(entry)
    // Keep only last 100 entries to prevent storage bloat
    if (history.length > 100) {
      history.shift()
    }
    localStorage.setItem(CONSENT_HISTORY_KEY, JSON.stringify(history))
  },

  /**
   * Clear all consent data (e.g., on user request for data deletion)
   */
  clearConsent() {
    localStorage.removeItem(CONSENT_STORAGE_KEY)
    localStorage.removeItem(CONSENT_TIMESTAMP_KEY)
    localStorage.removeItem(CONSENT_HISTORY_KEY)

    // Disable all non-essential tracking
    this.disableTracking()
  },

  /**
   * Initialize tracking services based on consent
   * This is called when user consent changes
   */
  initializeTracking(consentObj) {
    if (consentObj.analytics) {
      this.enableAnalytics()
    } else {
      this.disableAnalytics()
    }

    if (consentObj.marketing) {
      this.enableMarketing()
    } else {
      this.disableMarketing()
    }
  },

  /**
   * Enable analytics tracking
   * Replace with actual analytics initialization (GA, Mixpanel, etc.)
   */
  enableAnalytics() {
    // Example: Initialize Google Analytics
    // window.gtag('consent', 'update', { 'analytics_storage': 'granted' })
    console.log('Analytics enabled')
  },

  /**
   * Disable analytics tracking
   */
  disableAnalytics() {
    // Example: Disable Google Analytics
    // window.gtag('consent', 'update', { 'analytics_storage': 'denied' })
    console.log('Analytics disabled')
  },

  /**
   * Enable marketing tracking
   */
  enableMarketing() {
    // Example: Initialize Facebook Pixel
    // fbq('consent', 'grant')
    console.log('Marketing enabled')
  },

  /**
   * Disable marketing tracking
   */
  disableMarketing() {
    // Example: Disable Facebook Pixel
    // fbq('consent', 'revoke')
    console.log('Marketing disabled')
  },

  /**
   * Disable all tracking
   */
  disableTracking() {
    this.disableAnalytics()
    this.disableMarketing()
  },

  /**
   * Export user consent data (GDPR Article 15)
   */
  exportConsentData() {
    return {
      currentConsent: this.getConsent(),
      consentTimestamp: this.getConsentTimestamp(),
      consentHistory: this.getHistory(),
      exportDate: new Date().toISOString()
    }
  },

  /**
   * Check if consent is valid (not expired)
   * Consent is considered valid for 365 days
   */
  isConsentValid() {
    const timestamp = this.getConsentTimestamp()
    if (!timestamp) return false

    const consentDate = new Date(timestamp)
    const now = new Date()
    const daysDiff = (now - consentDate) / (1000 * 60 * 60 * 24)

    return daysDiff < 365
  },

  /**
   * Reset consent (requires explicit user action)
   * Shows banner again on next page load
   */
  resetConsent() {
    this.clearConsent()
    // Force banner to show on next page load
    sessionStorage.removeItem('cookie_banner_shown')
  }
}

export default CookieConsentService
