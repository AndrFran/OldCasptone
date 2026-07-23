import React from 'react'
import { Link } from 'react-router-dom'

/**
 * Terms of Service Page
 *
 * Legal terms governing use of Vibe Strike service
 * Covers user responsibilities, disclaimers, and dispute resolution
 */
export function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white py-12">
        <div className="container max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-gray-600 text-lg">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-12">
        {/* Agreement */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Agreement to Terms</h2>
          <p className="text-gray-700 mb-4">
            These Terms of Service ("Terms") constitute a legal agreement between you ("User," "you," "your") and Vibe Strike ("Company," "we," "us," "our"). By accessing and using the Vibe Strike website and services, you acknowledge that you have read, understood, and agree to be bound by these Terms.
          </p>
          <p className="text-gray-700">
            If you do not agree to these Terms, please do not use Vibe Strike. We reserve the right to modify these Terms at any time. Your continued use of Vibe Strike following any modifications constitutes your acceptance of the updated Terms.
          </p>
        </section>

        {/* Use License */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Use License</h2>
          <p className="text-gray-700 mb-4">
            We grant you a limited, non-exclusive, non-transferable license to access and use Vibe Strike for lawful purposes only. You agree not to:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Use Vibe Strike for any unlawful purpose or in violation of any applicable laws</li>
            <li>Attempt to gain unauthorized access to Vibe Strike or related systems</li>
            <li>Reverse engineer, decompile, or disassemble Vibe Strike</li>
            <li>Reproduce, duplicate, copy, or sell Vibe Strike for commercial purposes</li>
            <li>Use Vibe Strike to collect or track personal information without consent</li>
            <li>Upload viruses, malware, or any code with malicious intent</li>
            <li>Interfere with or disrupt the integrity or performance of Vibe Strike</li>
            <li>Harass, threaten, defame, or abuse other users</li>
          </ul>
        </section>

        {/* User Accounts */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Accounts</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">3.1 Account Creation</h3>
              <p className="text-gray-700">
                To access certain features, you must create an account by providing accurate, complete, and current information. You are responsible for maintaining the confidentiality of your password and for all activities that occur under your account.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">3.2 Account Security</h3>
              <p className="text-gray-700">
                You agree to notify us immediately of any unauthorized use of your account. We are not liable for damages or losses caused by unauthorized access to your account.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">3.3 Account Termination</h3>
              <p className="text-gray-700">
                We reserve the right to terminate or suspend accounts that violate these Terms or engage in abusive behavior, without notice or liability.
              </p>
            </div>
          </div>
        </section>

        {/* Products and Pricing */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Products and Pricing</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">4.1 Product Descriptions</h3>
              <p className="text-gray-700">
                We strive to provide accurate product descriptions and pricing. However, we do not warrant that product descriptions, pricing, or other content is accurate, complete, or error-free.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">4.2 Pricing and Availability</h3>
              <p className="text-gray-700">
                Prices are subject to change without notice. Products are subject to availability. We reserve the right to limit quantities and refuse orders.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">4.3 Coupon Codes</h3>
              <p className="text-gray-700">
                Coupon codes and promotional offers are subject to terms and conditions. We reserve the right to modify or cancel promotions at any time.
              </p>
            </div>
          </div>
        </section>

        {/* Orders and Payments */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Orders and Payments</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">5.1 Order Acceptance</h3>
              <p className="text-gray-700">
                We reserve the right to accept, reject, or cancel any order for any reason. You will be notified of order status via email.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">5.2 Payment</h3>
              <p className="text-gray-700">
                By placing an order, you authorize us to charge the payment method you provide. All payments are processed securely by third-party payment processors.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">5.3 Billing</h3>
              <p className="text-gray-700">
                You agree to provide accurate billing information and to promptly notify us of any changes to your payment method.
              </p>
            </div>
          </div>
        </section>

        {/* Shipping and Delivery */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Shipping and Delivery</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">6.1 Shipping Estimates</h3>
              <p className="text-gray-700">
                Estimated delivery dates are provided for convenience only and are not guaranteed. We are not liable for delays caused by shipping carriers or other factors beyond our control.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">6.2 Risk of Loss</h3>
              <p className="text-gray-700">
                Risk of loss for products transfers to you upon delivery to the shipping carrier. We recommend purchasing insurance for high-value items.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">6.3 Delivery Address</h3>
              <p className="text-gray-700">
                You are responsible for providing accurate delivery information. We are not liable for delivery failures due to incorrect addresses.
              </p>
            </div>
          </div>
        </section>

        {/* Returns and Refunds */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Returns and Refunds</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">7.1 Return Policy</h3>
              <p className="text-gray-700">
                Items may be returned within 30 days of purchase in original condition with all packaging and documentation. Refunds are processed within 5-7 business days after we receive and inspect the returned item.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">7.2 Refund Amount</h3>
              <p className="text-gray-700">
                Refunds will be issued to the original payment method. Shipping costs are non-refundable unless the return is due to our error.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">7.3 Non-Returnable Items</h3>
              <p className="text-gray-700">
                Certain items (clearance, final sale, customized products) may not be eligible for return. Check product page for details.
              </p>
            </div>
          </div>
        </section>

        {/* Warranties and Disclaimers */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Warranties and Disclaimers</h2>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">8.1 AS-IS Disclaimer</h3>
              <p className="text-gray-700">
                Vibe Strike and all products are provided "as is" without warranty of any kind, either express or implied. We disclaim all warranties including merchantability, fitness for a particular purpose, and non-infringement.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">8.2 Service Availability</h3>
              <p className="text-gray-700">
                We do not guarantee continuous, uninterrupted access to Vibe Strike. We may perform maintenance, updates, or improvements without notice.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">8.3 Third-Party Links</h3>
              <p className="text-gray-700">
                Vibe Strike may contain links to third-party websites. We are not responsible for their content, accuracy, or practices. Your use of third-party sites is at your own risk.
              </p>
            </div>
          </div>
        </section>

        {/* Limitation of Liability */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Limitation of Liability</h2>

          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-gray-700 mb-4">
              To the fullest extent permitted by law, Vibe Strike shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, loss of data, or business interruption, even if we have been advised of the possibility of such damages.
            </p>
            <p className="text-gray-700">
              Our total liability under these Terms shall not exceed the amount you paid for the product or service that caused the loss.
            </p>
          </div>
        </section>

        {/* Indemnification */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Indemnification</h2>
          <p className="text-gray-700">
            You agree to indemnify and hold harmless Vibe Strike from any claims, damages, losses, or expenses (including attorney's fees) arising from your use of Vibe Strike or violation of these Terms.
          </p>
        </section>

        {/* Dispute Resolution */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Dispute Resolution</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">11.1 Informal Resolution</h3>
              <p className="text-gray-700">
                Before initiating any legal action, you agree to contact us and attempt to resolve disputes informally.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">11.2 Governing Law</h3>
              <p className="text-gray-700">
                These Terms are governed by and construed in accordance with the laws of the jurisdiction in which Vibe Strike is based, without regard to its conflict of law principles.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">11.3 Arbitration</h3>
              <p className="text-gray-700">
                Any disputes shall be resolved through binding arbitration, except that either party may seek injunctive relief in court for IP infringement or violation of these Terms.
              </p>
            </div>
          </div>
        </section>

        {/* Intellectual Property */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Intellectual Property Rights</h2>
          <p className="text-gray-700 mb-4">
            All content, features, and functionality of Vibe Strike (including text, graphics, logos, images, software) are the exclusive property of Vibe Strike or its content providers and are protected by copyright, trademark, and other intellectual property laws.
          </p>
          <p className="text-gray-700">
            You may not reproduce, distribute, transmit, or display any content without our prior written permission.
          </p>
        </section>

        {/* User Content */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">13. User-Generated Content</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">13.1 License to Use</h3>
              <p className="text-gray-700">
                By posting reviews, comments, or other content on Vibe Strike, you grant us a non-exclusive, worldwide, royalty-free license to use your content in any manner.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">13.2 Content Responsibility</h3>
              <p className="text-gray-700">
                You are solely responsible for content you post. Do not post unlawful, defamatory, abusive, or infringing content.
              </p>
            </div>
          </div>
        </section>

        {/* Termination */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Termination</h2>
          <p className="text-gray-700">
            We may terminate or suspend your access to Vibe Strike at any time, with or without cause, without notice or liability. Upon termination, your right to use Vibe Strike immediately ceases.
          </p>
        </section>

        {/* Modifications */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Modifications to Terms</h2>
          <p className="text-gray-700">
            We reserve the right to modify these Terms at any time. Changes are effective immediately upon posting. Your continued use of Vibe Strike constitutes acceptance of modified Terms.
          </p>
        </section>

        {/* Contact */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">16. Contact Information</h2>
          <div className="bg-gray-100 rounded-lg p-6">
            <p className="text-gray-700 mb-2">
              For questions about these Terms, please contact us at:
            </p>
            <p className="text-gray-700">
              Email: <a href="mailto:support@vibestrike.com" className="text-blue-600 hover:underline">support@vibestrike.com</a>
            </p>
            <p className="text-gray-700 mt-4">
              <Link to="/contact" className="text-blue-600 hover:underline">Contact Us</Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

export default TermsOfService
