import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import AccessibleFormField from '../components/AccessibleFormField'

/**
 * Contact Us Page
 *
 * Support contact form with privacy officer information
 * and various departments for customer support
 */
export function ContactUs() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'support',
    message: ''
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const contactCategories = [
    {
      id: 'support',
      label: 'General Support',
      description: 'Account issues, orders, or product questions'
    },
    {
      id: 'privacy',
      label: 'Privacy & Data Protection',
      description: 'GDPR requests, privacy concerns, or data issues'
    },
    {
      id: 'security',
      label: 'Security Report',
      description: 'Report security vulnerabilities or breaches'
    },
    {
      id: 'feedback',
      label: 'Feedback & Suggestions',
      description: 'Suggestions for improvements or feedback'
    },
    {
      id: 'complaint',
      label: 'Complaint',
      description: 'File a formal complaint about our service'
    },
    {
      id: 'business',
      label: 'Business Inquiry',
      description: 'Partnerships, bulk orders, or wholesale'
    }
  ]

  const departments = [
    {
      name: 'Customer Support',
      email: 'support@vibestrike.com',
      responseTime: '24 hours',
      phone: '+1 (555) 123-4567'
    },
    {
      name: 'Data Protection Officer (DPO)',
      email: 'dpo@vibestrike.com',
      responseTime: '5 business days',
      specialization: 'GDPR & Data Subject Rights'
    },
    {
      name: 'Privacy Team',
      email: 'privacy@vibestrike.com',
      responseTime: '3 business days',
      specialization: 'Privacy Concerns & Complaints'
    },
    {
      name: 'Security Team',
      email: 'security@vibestrike.com',
      responseTime: '24 hours',
      specialization: 'Security Vulnerabilities'
    },
    {
      name: 'Business Development',
      email: 'business@vibestrike.com',
      responseTime: '2 business days',
      specialization: 'Partnerships & Wholesale'
    }
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setSubmitted(true)
        setTimeout(() => {
          setSubmitted(false)
          setFormData({
            name: '',
            email: '',
            subject: '',
            category: 'support',
            message: ''
          })
        }, 5000)
      } else {
        alert('Error sending message. Please try again.')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error sending message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white py-12">
        <div className="container max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-gray-600 text-lg">
            We're here to help. Get in touch with the right team for your needs.
          </p>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-12">
        {/* Quick Contact Methods */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Contact Methods</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Email */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="text-3xl mb-3">📧</div>
              <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
              <p className="text-gray-600 text-sm mb-4">
                Send us a message using the form below or email directly:
              </p>
              <a href="mailto:support@vibestrike.com" className="text-blue-600 hover:underline font-medium">
                support@vibestrike.com
              </a>
            </div>

            {/* Phone */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="text-3xl mb-3">📞</div>
              <h3 className="font-semibold text-gray-900 mb-2">Phone</h3>
              <p className="text-gray-600 text-sm mb-4">
                Call our customer service team:
              </p>
              <a href="tel:+15551234567" className="text-blue-600 hover:underline font-medium">
                +1 (555) 123-4567
              </a>
              <p className="text-gray-600 text-sm mt-2">Mon-Fri, 9am-6pm EST</p>
            </div>

            {/* Live Chat */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="text-3xl mb-3">💬</div>
              <h3 className="font-semibold text-gray-900 mb-2">Live Chat</h3>
              <p className="text-gray-600 text-sm mb-4">
                Chat with our support team in real time:
              </p>
              <button className="text-blue-600 hover:underline font-medium">
                Start Chat
              </button>
              <p className="text-gray-600 text-sm mt-2">Available 24/7</p>
            </div>
          </div>
        </section>

        {/* Departments */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Departments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {departments.map((dept) => (
              <div key={dept.email} className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 text-lg mb-2">{dept.name}</h3>
                {dept.specialization && (
                  <p className="text-blue-600 text-sm font-medium mb-3">{dept.specialization}</p>
                )}
                <div className="space-y-2 text-sm text-gray-700">
                  <p>
                    <strong>Email:</strong>{' '}
                    <a href={`mailto:${dept.email}`} className="text-blue-600 hover:underline">
                      {dept.email}
                    </a>
                  </p>
                  {dept.phone && (
                    <p>
                      <strong>Phone:</strong>{' '}
                      <a href={`tel:${dept.phone.replace(/\D/g, '')}`} className="text-blue-600 hover:underline">
                        {dept.phone}
                      </a>
                    </p>
                  )}
                  <p>
                    <strong>Response Time:</strong> {dept.responseTime}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <section className="bg-white rounded-lg p-8 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>

              {submitted ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">Message Sent!</h3>
                  <p className="text-green-800 mb-3">
                    Thank you for contacting us. We've received your message and will respond as soon as possible.
                  </p>
                  <p className="text-green-800 text-sm">
                    A confirmation email has been sent to <strong>{formData.email}</strong>.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name */}
                  <AccessibleFormField
                    label="Your Name"
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="John Doe"
                  />

                  {/* Email */}
                  <AccessibleFormField
                    label="Email Address"
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="your@email.com"
                  />

                  {/* Category */}
                  <div>
                    <label htmlFor="category" className="block text-sm font-semibold text-gray-900 mb-2">
                      Category
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {contactCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject */}
                  <AccessibleFormField
                    label="Subject"
                    id="subject"
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    placeholder="How can we help?"
                  />

                  {/* Message */}
                  <div>
                    <label htmlFor="message" className="block text-sm font-semibold text-gray-900 mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      placeholder="Tell us more about your inquiry..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={6}
                    />
                  </div>

                  {/* Privacy Notice */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      We respect your privacy. For more information about how we handle your data, see our{' '}
                      <Link to="/privacy-policy" className="text-blue-600 hover:underline font-medium">
                        Privacy Policy
                      </Link>
                      .
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </section>
          </div>

          {/* Sidebar Info */}
          <aside className="space-y-6">
            {/* Hours of Operation */}
            <section className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Hours of Operation</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Monday - Friday:</strong> 9am - 6pm EST</p>
                <p><strong>Saturday:</strong> 10am - 4pm EST</p>
                <p><strong>Sunday:</strong> Closed</p>
                <p className="mt-4 pt-4 border-t">
                  <strong>Live Chat:</strong> Available 24/7
                </p>
              </div>
            </section>

            {/* Data Protection Officer */}
            <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Data Protection Officer</h3>
              <p className="text-sm text-gray-700 mb-3">
                For GDPR and privacy-related inquiries:
              </p>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Email:</strong>{' '}
                  <a href="mailto:dpo@vibestrike.com" className="text-blue-600 hover:underline">
                    dpo@vibestrike.com
                  </a>
                </p>
                <p className="text-sm">
                  <strong>Response:</strong> 5 business days
                </p>
              </div>
            </section>

            {/* Resources */}
            <section className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Resources</h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/privacy-policy" className="text-blue-600 hover:underline text-sm">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms-of-service" className="text-blue-600 hover:underline text-sm">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/cookie-policy" className="text-blue-600 hover:underline text-sm">
                    Cookie Policy
                  </Link>
                </li>
                <li>
                  <Link to="/data-rights" className="text-blue-600 hover:underline text-sm">
                    Your Data Rights
                  </Link>
                </li>
              </ul>
            </section>
          </aside>
        </div>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>

          <div className="space-y-4">
            <details className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer">
              <summary className="font-semibold text-gray-900 text-lg">
                What's the expected response time?
              </summary>
              <p className="text-gray-700 mt-4">
                We aim to respond within 24-48 hours for general support and customer service inquiries. Privacy and GDPR requests are processed within 5 business days.
              </p>
            </details>

            <details className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer">
              <summary className="font-semibold text-gray-900 text-lg">
                How do I report a security vulnerability?
              </summary>
              <p className="text-gray-700 mt-4">
                Please email our Security Team at security@vibestrike.com. Do not publicly disclose the vulnerability. We have a responsible disclosure policy and may provide bounties for critical vulnerabilities.
              </p>
            </details>

            <details className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer">
              <summary className="font-semibold text-gray-900 text-lg">
                How do I file a formal complaint?
              </summary>
              <p className="text-gray-700 mt-4">
                You can file a complaint through this contact form by selecting "Complaint" as the category. We will investigate and respond within 10 business days. You also have the right to lodge a complaint with your national data protection authority.
              </p>
            </details>

            <details className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer">
              <summary className="font-semibold text-gray-900 text-lg">
                Can I request my data be deleted?
              </summary>
              <p className="text-gray-700 mt-4">
                Yes. You can submit a "Right to Be Forgotten" request on our <Link to="/data-rights" className="text-blue-600 hover:underline">Data Rights page</Link>. We'll process it within 30 days, subject to legal retention requirements.
              </p>
            </details>
          </div>
        </section>

        {/* Mailing Address */}
        <section className="bg-gray-100 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Mailing Address</h2>
          <div className="space-y-3 text-gray-700">
            <p>
              <strong>Vibe Strike Inc.</strong><br/>
              123 E-Commerce Street<br/>
              Suite 500<br/>
              San Francisco, CA 94105<br/>
              United States
            </p>
            <p className="text-sm mt-6">
              This is our registered office for legal and privacy purposes.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ContactUs
