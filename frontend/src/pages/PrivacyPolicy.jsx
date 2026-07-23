import React from 'react'
import { Link } from 'react-router-dom'

/**
 * Privacy Policy Page
 *
 * GDPR-compliant privacy policy covering:
 * - Data collection practices
 * - How data is used
 * - Data sharing practices
 * - User rights (Articles 15-22 of GDPR)
 * - Data retention policies
 * - Contact for data requests
 */
export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white py-12">
        <div className="container max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-600 text-lg">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-12">
        {/* Introduction */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
          <p className="text-gray-700 mb-4">
            Vibe Strike ("Company," "we," "us," "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
          </p>
          <p className="text-gray-700">
            Please read this Privacy Policy carefully. By accessing and using Vibe Strike, you acknowledge that you have read, understood, and agree to be bound by all the terms of this Privacy Policy.
          </p>
        </section>

        {/* Information We Collect */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.1 Account Information</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Email address</li>
                <li>Password (hashed and encrypted)</li>
                <li>Name (for orders)</li>
                <li>Phone number (optional)</li>
                <li>Delivery address</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.2 Browsing Information</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Products viewed</li>
                <li>Search queries</li>
                <li>Pages visited and time spent</li>
                <li>Referring website</li>
                <li>IP address and device information</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.3 Transaction Information</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Order history and details</li>
                <li>Payment information (processed by secure payment providers)</li>
                <li>Coupon codes used</li>
                <li>Returns and refunds</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.4 Communication Information</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Customer service inquiries</li>
                <li>Support tickets</li>
                <li>Feedback and reviews</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.5 Technical Information</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Browser type and version</li>
                <li>Operating system</li>
                <li>Device type</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </div>
          </div>
        </section>

        {/* How We Use Information */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Lawful Basis for Processing (GDPR Article 6)</h3>
            <p className="text-gray-700 text-sm">We process your personal data based on: (a) your consent, (b) contract fulfillment, (c) legal obligations, (d) vital interests, (e) public task, or (f) legitimate interests.</p>
          </div>

          <ul className="list-disc list-inside text-gray-700 space-y-3">
            <li><strong>Service Delivery:</strong> Process orders, send confirmations, and track shipments</li>
            <li><strong>Account Management:</strong> Create and manage your account, authenticate users</li>
            <li><strong>Customer Support:</strong> Respond to inquiries and resolve issues</li>
            <li><strong>Personalization:</strong> Recommend products based on browsing history (with consent)</li>
            <li><strong>Marketing:</strong> Send promotional emails and offers (only with opt-in consent)</li>
            <li><strong>Analytics:</strong> Understand user behavior and improve our services (with consent)</li>
            <li><strong>Fraud Prevention:</strong> Detect and prevent fraudulent transactions</li>
            <li><strong>Legal Compliance:</strong> Comply with laws, regulations, and legal requests</li>
          </ul>
        </section>

        {/* Data Sharing */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Who We Share Your Data With</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">4.1 Third-Party Service Providers</h3>
              <p className="text-gray-700 mb-3">We share limited information with trusted service providers:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li><strong>Payment Processors:</strong> Stripe, PayPal (payment information only)</li>
                <li><strong>Shipping Providers:</strong> Delivery address and order details</li>
                <li><strong>Analytics Platforms:</strong> Google Analytics (with consent only)</li>
                <li><strong>Email Services:</strong> SendGrid (for transactional and marketing emails)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">4.2 Legal Requirements</h3>
              <p className="text-gray-700">
                We may disclose personal information if required by law, such as in response to subpoenas, court orders, or other legal processes.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">4.3 Business Transfers</h3>
              <p className="text-gray-700">
                In the event of merger, acquisition, or bankruptcy, personal information may be transferred as part of that transaction.
              </p>
            </div>
          </div>
        </section>

        {/* Data Retention */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Retention</h2>
          <div className="bg-gray-100 rounded-lg p-6">
            <div className="space-y-4 text-gray-700">
              <p><strong>Account Data:</strong> Retained while account is active, deleted upon account closure + 30 days</p>
              <p><strong>Order History:</strong> Retained for 7 years for accounting and legal purposes</p>
              <p><strong>Browsing Data:</strong> Retained for up to 12 months for analytics</p>
              <p><strong>Cookie Data:</strong> Valid for 365 days from creation</p>
              <p><strong>Marketing Communications:</strong> Retained until you unsubscribe</p>
            </div>
          </div>
        </section>

        {/* Your Rights (GDPR) */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Data Rights (GDPR Articles 15-22)</h2>

          <div className="space-y-4 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Right to Access (Article 15)</h3>
              <p className="text-gray-700 text-sm">
                You have the right to request a copy of all personal data we hold about you. <Link to="/data-rights" className="text-blue-600 hover:underline">Submit a data access request</Link>.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Right to Be Forgotten (Article 17)</h3>
              <p className="text-gray-700 text-sm">
                You have the right to request deletion of your personal data, subject to legal retention requirements. <Link to="/data-rights" className="text-blue-600 hover:underline">Submit a deletion request</Link>.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Right to Rectification (Article 16)</h3>
              <p className="text-gray-700 text-sm">
                You have the right to correct inaccurate or incomplete personal data. You can update your account information directly.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Right to Restrict Processing (Article 18)</h3>
              <p className="text-gray-700 text-sm">
                You may request we limit how we use your data while we investigate disputes or verify accuracy.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Right to Data Portability (Article 20)</h3>
              <p className="text-gray-700 text-sm">
                You have the right to receive your data in a structured, commonly-used format. <Link to="/data-rights" className="text-blue-600 hover:underline">Request your data export</Link>.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Right to Object (Article 21)</h3>
              <p className="text-gray-700 text-sm">
                You have the right to object to processing for marketing purposes. Unsubscribe links are included in all marketing emails.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Rights Related to Automated Decision-Making (Article 22)</h3>
              <p className="text-gray-700 text-sm">
                We do not make automated decisions that significantly affect you. All recommendations are informational only.
              </p>
            </div>
          </div>
        </section>

        {/* Cookies */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Cookies and Tracking Technologies</h2>
          <p className="text-gray-700 mb-4">
            For detailed information about the cookies we use and how to manage them, please see our <Link to="/cookie-policy" className="text-blue-600 hover:underline">Cookie Policy</Link>.
          </p>
        </section>

        {/* Security */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Data Security</h2>
          <p className="text-gray-700 mb-4">
            We implement industry-standard security measures to protect your personal data:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>SSL/TLS encryption for data in transit</li>
            <li>Hashed and salted passwords</li>
            <li>Regular security audits and penetration testing</li>
            <li>Restricted access to personal data</li>
            <li>Secure data disposal procedures</li>
          </ul>
          <p className="text-gray-700 mt-4">
            While we strive to protect your information, no security system is completely secure. Please notify us immediately of any security breaches.
          </p>
        </section>

        {/* Children's Privacy */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Children's Privacy</h2>
          <p className="text-gray-700">
            Vibe Strike is not intended for children under 13 years old. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child under 13, we will delete it immediately.
          </p>
        </section>

        {/* International Transfers */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">10. International Data Transfers</h2>
          <p className="text-gray-700">
            Your personal data may be transferred to and stored in countries outside your country of residence. These countries may not have the same data protection laws as your home country. By using Vibe Strike, you consent to such transfers. We will implement appropriate safeguards such as Standard Contractual Clauses.
          </p>
        </section>

        {/* Contact Information */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact Us</h2>
          <div className="bg-gray-100 rounded-lg p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">Data Protection Officer</h3>
              <p className="text-gray-700">Email: privacy@vibestrike.com</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Privacy Inquiries</h3>
              <p className="text-gray-700">
                <Link to="/contact" className="text-blue-600 hover:underline">Submit a privacy request</Link>
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Data Subject Rights Requests</h3>
              <p className="text-gray-700">
                <Link to="/data-rights" className="text-blue-600 hover:underline">Submit a GDPR request</Link>
              </p>
            </div>
          </div>
        </section>

        {/* Changes to Policy */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Changes to This Privacy Policy</h2>
          <p className="text-gray-700">
            We may update this Privacy Policy periodically to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of material changes by email or by posting the updated policy on our website with an updated "Last Updated" date. Your continued use of Vibe Strike after such changes constitutes your acceptance of the updated Privacy Policy.
          </p>
        </section>

        {/* Compliance Links */}
        <section className="bg-gray-100 rounded-lg p-6 mb-12">
          <h3 className="font-semibold text-gray-900 mb-4">Additional Resources</h3>
          <ul className="space-y-2">
            <li><Link to="/cookie-policy" className="text-blue-600 hover:underline">Cookie Policy</Link></li>
            <li><Link to="/terms-of-service" className="text-blue-600 hover:underline">Terms of Service</Link></li>
            <li><Link to="/data-rights" className="text-blue-600 hover:underline">GDPR Data Subject Rights</Link></li>
            <li><Link to="/contact" className="text-blue-600 hover:underline">Contact Us</Link></li>
          </ul>
        </section>
      </div>
    </div>
  )
}

export default PrivacyPolicy
