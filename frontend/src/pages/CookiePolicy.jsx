import React from 'react'
import { Link } from 'react-router-dom'

/**
 * Cookie Policy Page
 *
 * Detailed information about cookies used by Vibe Strike
 * Including types, purposes, and how to manage them
 */
export function CookiePolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white py-12">
        <div className="container max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Cookie Policy</h1>
          <p className="text-gray-600 text-lg">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-12">
        {/* What are Cookies */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. What Are Cookies?</h2>
          <p className="text-gray-700 mb-4">
            Cookies are small text files stored on your device that allow websites to remember information about your visit. Cookies help provide a better browsing experience and are used for various purposes including authentication, preferences, and analytics.
          </p>
          <p className="text-gray-700">
            There are two types of cookies:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 mt-3">
            <li><strong>Session Cookies:</strong> Deleted when you close your browser</li>
            <li><strong>Persistent Cookies:</strong> Remain on your device until expiration or deletion</li>
          </ul>
        </section>

        {/* How We Use Cookies */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Cookies</h2>
          <p className="text-gray-700 mb-4">
            We use cookies for the following purposes:
          </p>

          <div className="space-y-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Essential Cookies (Required)</h3>
              <p className="text-gray-700 mb-3">
                These cookies are necessary for the website to function properly. You cannot disable these without breaking site functionality.
              </p>
              <div className="bg-gray-50 rounded p-3 text-sm space-y-2">
                <div>
                  <strong>session_id</strong>
                  <p className="text-gray-600">Keeps you logged in while browsing</p>
                  <p className="text-gray-600">Expires: When you close your browser</p>
                </div>
                <div>
                  <strong>csrf_token</strong>
                  <p className="text-gray-600">Protects against cross-site request forgery attacks</p>
                  <p className="text-gray-600">Expires: Session end</p>
                </div>
                <div>
                  <strong>cookie_consent</strong>
                  <p className="text-gray-600">Remembers your cookie preferences</p>
                  <p className="text-gray-600">Expires: 365 days</p>
                </div>
                <div>
                  <strong>user_preferences</strong>
                  <p className="text-gray-600">Stores essential user settings (language, theme)</p>
                  <p className="text-gray-600">Expires: 365 days</p>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-amber-500 pl-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics Cookies (Optional)</h3>
              <p className="text-gray-700 mb-3">
                These cookies help us understand how you use Vibe Strike so we can improve the experience. Requires explicit consent.
              </p>
              <div className="bg-gray-50 rounded p-3 text-sm space-y-2">
                <div>
                  <strong>_ga</strong>
                  <p className="text-gray-600">Google Analytics - Tracks visitor behavior and traffic patterns</p>
                  <p className="text-gray-600">Provider: Google | Expires: 2 years</p>
                </div>
                <div>
                  <strong>_gid</strong>
                  <p className="text-gray-600">Google Analytics - Session identifier</p>
                  <p className="text-gray-600">Provider: Google | Expires: 24 hours</p>
                </div>
                <div>
                  <strong>analytics_uuid</strong>
                  <p className="text-gray-600">Internal analytics - Device identifier</p>
                  <p className="text-gray-600">Expires: 12 months</p>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Marketing Cookies (Optional)</h3>
              <p className="text-gray-700 mb-3">
                These cookies are used for targeted advertising and remarketing campaigns. Requires explicit consent.
              </p>
              <div className="bg-gray-50 rounded p-3 text-sm space-y-2">
                <div>
                  <strong>_fbp</strong>
                  <p className="text-gray-600">Facebook Pixel - Tracks conversion events and user behavior</p>
                  <p className="text-gray-600">Provider: Meta | Expires: 90 days</p>
                </div>
                <div>
                  <strong>fr</strong>
                  <p className="text-gray-600">Facebook - Delivers and measures ads</p>
                  <p className="text-gray-600">Provider: Meta | Expires: 90 days</p>
                </div>
                <div>
                  <strong>marketing_uuid</strong>
                  <p className="text-gray-600">Internal marketing - Track marketing campaign effectiveness</p>
                  <p className="text-gray-600">Expires: 12 months</p>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Preference Cookies (Optional)</h3>
              <p className="text-gray-700 mb-3">
                These cookies remember your choices and preferences to enhance your experience.
              </p>
              <div className="bg-gray-50 rounded p-3 text-sm space-y-2">
                <div>
                  <strong>theme</strong>
                  <p className="text-gray-600">Remembers your light/dark mode preference</p>
                  <p className="text-gray-600">Expires: 365 days</p>
                </div>
                <div>
                  <strong>language</strong>
                  <p className="text-gray-600">Stores your preferred language</p>
                  <p className="text-gray-600">Expires: 365 days</p>
                </div>
                <div>
                  <strong>recently_viewed</strong>
                  <p className="text-gray-600">Tracks products you've recently viewed</p>
                  <p className="text-gray-600">Expires: 30 days</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Third-Party Cookies */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Third-Party Cookies</h2>
          <p className="text-gray-700 mb-4">
            Third-party service providers may set cookies on your device. Here are the main ones:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">Service</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Purpose</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Policy Link</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2"><strong>Google Analytics</strong></td>
                  <td className="border border-gray-300 px-4 py-2">Website traffic analysis</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Privacy Policy
                    </a>
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2"><strong>Meta (Facebook)</strong></td>
                  <td className="border border-gray-300 px-4 py-2">Advertising and conversion tracking</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <a href="https://www.facebook.com/privacy/explanation" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Privacy Policy
                    </a>
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2"><strong>Stripe</strong></td>
                  <td className="border border-gray-300 px-4 py-2">Payment processing</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Privacy Policy
                    </a>
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2"><strong>SendGrid</strong></td>
                  <td className="border border-gray-300 px-4 py-2">Email tracking and delivery</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <a href="https://www.twilio.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Privacy Policy
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* How to Control Cookies */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. How to Control Cookies</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">4.1 Using Our Cookie Banner</h3>
              <p className="text-gray-700">
                When you first visit Vibe Strike, a cookie consent banner appears at the bottom of the page. You can:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mt-2 ml-2">
                <li>Click "Accept All" to consent to all cookies</li>
                <li>Click "Reject All" to decline optional cookies</li>
                <li>Click "Preferences" to customize which cookies to accept</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">4.2 Browser Settings</h3>
              <p className="text-gray-700 mb-3">
                You can also control cookies through your browser settings. Here's how for major browsers:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-2">
                <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies and other site data</li>
                <li><strong>Firefox:</strong> Preferences → Privacy & Security → Cookies and Site Data</li>
                <li><strong>Safari:</strong> Preferences → Privacy → Cookies and website data</li>
                <li><strong>Edge:</strong> Settings → Privacy, search, and services → Clear browsing data</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">4.3 Opt-Out Tools</h3>
              <p className="text-gray-700">
                You can opt out of specific tracking services:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mt-2 ml-2">
                <li>
                  <strong>Google Analytics:</strong>{' '}
                  <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Google Analytics Opt-Out Browser Add-On
                  </a>
                </li>
                <li>
                  <strong>Network Advertising:</strong>{' '}
                  <a href="https://optout.networkadvertising.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    NAI Opt-Out Tool
                  </a>
                </li>
                <li>
                  <strong>Digital Advertising Alliance:</strong>{' '}
                  <a href="https://optout.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    DAA Opt-Out Tool
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">4.4 DNT (Do Not Track)</h3>
              <p className="text-gray-700">
                Many browsers have a "Do Not Track" feature. While we recognize DNT signals, we cannot guarantee all third-party services will honor them.
              </p>
            </div>
          </div>
        </section>

        {/* Impact of Disabling Cookies */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Impact of Disabling Cookies</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <p className="text-gray-700 mb-3">
              If you disable all cookies, you may experience:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Unable to log in to your account</li>
              <li>Cart items not being saved</li>
              <li>Inability to complete checkout</li>
              <li>Loss of your preferences (theme, language)</li>
              <li>Reduced personalization</li>
            </ul>
            <p className="text-gray-700 mt-4">
              However, disabling only optional cookies (analytics and marketing) will not affect site functionality.
            </p>
          </div>
        </section>

        {/* Cookie Retention */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cookie Retention</h2>
          <p className="text-gray-700 mb-4">
            We delete cookies according to the following schedule:
          </p>
          <div className="bg-gray-100 rounded-lg p-6 space-y-3 text-gray-700">
            <p><strong>Essential Cookies:</strong> Kept for 365 days from last activity</p>
            <p><strong>Analytics Cookies:</strong> Automatically deleted by Google/third-party services per their policies (typically 12-24 months)</p>
            <p><strong>Marketing Cookies:</strong> Deleted after 90 days of inactivity</p>
            <p><strong>Preference Cookies:</strong> Kept for 365 days unless manually deleted</p>
          </div>
        </section>

        {/* GDPR Compliance */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. GDPR Compliance</h2>
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
            <p className="text-gray-700">
              Under GDPR, we obtain your explicit consent before setting non-essential cookies. You have the right to:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Withdraw consent at any time</li>
              <li>Request information about cookies we use</li>
              <li>Have cookies deleted</li>
              <li>Object to tracking</li>
            </ul>
            <p className="text-gray-700 mt-4">
              To manage your cookie preferences at any time, click the "Cookie Preferences" link in the footer.
            </p>
          </div>
        </section>

        {/* Changes to Policy */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Changes to This Cookie Policy</h2>
          <p className="text-gray-700">
            We may update this Cookie Policy to reflect changes in our cookie practices or legal requirements. We will notify you of material changes by posting the updated policy with an updated "Last Updated" date.
          </p>
        </section>

        {/* Contact Information */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Questions?</h2>
          <div className="bg-gray-100 rounded-lg p-6">
            <p className="text-gray-700 mb-4">
              If you have questions about our use of cookies or this policy, please contact us:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li>Email: <a href="mailto:privacy@vibestrike.com" className="text-blue-600 hover:underline">privacy@vibestrike.com</a></li>
              <li><Link to="/contact" className="text-blue-600 hover:underline">Contact Us</Link></li>
              <li><Link to="/data-rights" className="text-blue-600 hover:underline">GDPR Data Rights</Link></li>
            </ul>
          </div>
        </section>

        {/* Related Links */}
        <section className="bg-gray-100 rounded-lg p-6 mb-12">
          <h3 className="font-semibold text-gray-900 mb-4">Related Documents</h3>
          <ul className="space-y-2">
            <li><Link to="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</Link></li>
            <li><Link to="/terms-of-service" className="text-blue-600 hover:underline">Terms of Service</Link></li>
            <li><Link to="/data-rights" className="text-blue-600 hover:underline">GDPR Data Subject Rights</Link></li>
          </ul>
        </section>
      </div>
    </div>
  )
}

export default CookiePolicy
