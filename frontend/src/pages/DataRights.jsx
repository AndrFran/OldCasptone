import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import AccessibleFormField from '../components/AccessibleFormField'

/**
 * Data Rights Page
 *
 * GDPR Data Subject Rights (Articles 15-22)
 * Allows users to submit requests for:
 * - Right to Access (Article 15)
 * - Right to Be Forgotten (Article 17)
 * - Right to Data Portability (Article 20)
 * - Right to Rectification (Article 16)
 * - Right to Restrict Processing (Article 18)
 */
export function DataRights() {
  const [selectedRight, setSelectedRight] = useState('access')
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    requestType: 'access',
    reason: '',
    attachments: []
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const dataRights = [
    {
      id: 'access',
      title: 'Right to Access (Article 15)',
      subtitle: 'Get a copy of your personal data',
      description: 'You have the right to request and receive a copy of all personal data we hold about you in a structured, commonly-used format.',
      timeframe: '30 days',
      response: 'We will send you a comprehensive data export including all information we hold'
    },
    {
      id: 'forgotten',
      title: 'Right to Be Forgotten (Article 17)',
      subtitle: 'Request deletion of your data',
      description: 'You have the right to request deletion of your personal data, except where we have legal obligations to retain it.',
      timeframe: '30 days',
      response: 'We will delete your data except records required by law (accounting, tax)'
    },
    {
      id: 'portability',
      title: 'Right to Data Portability (Article 20)',
      subtitle: 'Transfer your data elsewhere',
      description: 'You have the right to receive your personal data and transmit it to another organization without hindrance.',
      timeframe: '30 days',
      response: 'We will provide your data in a machine-readable format (CSV, JSON)'
    },
    {
      id: 'rectification',
      title: 'Right to Rectification (Article 16)',
      subtitle: 'Correct inaccurate data',
      description: 'You have the right to correct inaccurate or incomplete personal data we hold about you.',
      timeframe: 'Immediate',
      response: 'We will correct inaccuracies immediately after verification'
    },
    {
      id: 'restrict',
      title: 'Right to Restrict Processing (Article 18)',
      subtitle: 'Limit how we use your data',
      description: 'You have the right to request we limit the processing of your personal data while we investigate or verify disputes.',
      timeframe: '30 days',
      response: 'We will restrict processing except for storage and legal requirements'
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
      // Send to backend API (will need to implement this)
      const response = await fetch('/api/gdpr/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setSubmitted(true)
        // Reset form after 5 seconds
        setTimeout(() => {
          setSubmitted(false)
          setFormData({
            email: '',
            firstName: '',
            lastName: '',
            requestType: 'access',
            reason: '',
            attachments: []
          })
        }, 5000)
      } else {
        alert('Error submitting request. Please try again.')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error submitting request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white py-12">
        <div className="container max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Your Data Rights</h1>
          <p className="text-gray-600 text-lg">
            GDPR and EU data protection rights - Submit a request below
          </p>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-12">
        {/* Overview */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">About Your Rights</h2>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-6">
            <p className="text-gray-700 mb-3">
              Under the General Data Protection Regulation (GDPR) and other data protection laws, you have specific rights regarding your personal data. Below you can submit requests to exercise any of these rights.
            </p>
            <p className="text-gray-700">
              We will respond to your request within 30 days. No fee is required unless your request is manifestly unfounded or excessive.
            </p>
          </div>
        </section>

        {/* Rights Overview */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Five Core Rights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {dataRights.map((right) => (
              <div
                key={right.id}
                onClick={() => setSelectedRight(right.id)}
                className={`cursor-pointer p-6 rounded-lg border-2 transition-all ${
                  selectedRight === right.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">
                      {right.title}
                    </h3>
                    <p className="text-sm text-gray-600">{right.subtitle}</p>
                    <p className="text-sm text-blue-600 mt-2">
                      Response time: <strong>{right.timeframe}</strong>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Selected Right Details */}
        <section className="mb-12 bg-white rounded-lg p-8 border border-gray-200">
          {dataRights.map((right) => (
            selectedRight === right.id && (
              <div key={right.id}>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">{right.title}</h2>
                <p className="text-gray-700 text-lg mb-4">{right.subtitle}</p>

                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">What This Right Covers</h3>
                  <p className="text-gray-700">{right.description}</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">What You'll Receive</h3>
                  <p className="text-gray-700">{right.response}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 font-semibold">Response Time</p>
                    <p className="text-lg text-gray-900 font-bold">{right.timeframe}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 font-semibold">Cost</p>
                    <p className="text-lg text-gray-900 font-bold">Free (in most cases)</p>
                  </div>
                </div>
              </div>
            )
          ))}
        </section>

        {/* Submission Form */}
        <section className="mb-12 bg-white rounded-lg p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit Your Request</h2>

          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                Request Submitted Successfully
              </h3>
              <p className="text-green-800 mb-3">
                Your data subject rights request has been received. We will process it within 30 days.
              </p>
              <p className="text-green-800 text-sm">
                A confirmation email has been sent to <strong>{formData.email}</strong>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Request Type */}
              <div>
                <label htmlFor="requestType" className="block text-sm font-semibold text-gray-900 mb-2">
                  Request Type
                </label>
                <select
                  id="requestType"
                  name="requestType"
                  value={formData.requestType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="access">Right to Access - Get a copy of my data</option>
                  <option value="forgotten">Right to Be Forgotten - Delete my data</option>
                  <option value="portability">Right to Data Portability - Export my data</option>
                  <option value="rectification">Right to Rectification - Correct my data</option>
                  <option value="restrict">Right to Restrict - Limit processing of my data</option>
                </select>
              </div>

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
                helpText="The email associated with your Vibe Strike account"
              />

              {/* Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AccessibleFormField
                  label="First Name"
                  id="firstName"
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  placeholder="John"
                />
                <AccessibleFormField
                  label="Last Name"
                  id="lastName"
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  placeholder="Doe"
                />
              </div>

              {/* Additional Information */}
              <div>
                <label htmlFor="reason" className="block text-sm font-semibold text-gray-900 mb-2">
                  Additional Information (Optional)
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  placeholder="Provide any additional context or information relevant to your request"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />
                <p className="text-sm text-gray-600 mt-2">
                  Example: "I would like to export my purchase history for the past year"
                </p>
              </div>

              {/* Verification Note */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> For security purposes, we may request additional verification of your identity before processing your request.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                aria-label="Submit data subject rights request"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>

              <p className="text-xs text-gray-600">
                By submitting this form, you confirm you are the data subject or authorized representative.
              </p>
            </form>
          )}
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>

          <div className="space-y-4">
            <details className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer">
              <summary className="font-semibold text-gray-900 text-lg">
                How long will it take to process my request?
              </summary>
              <p className="text-gray-700 mt-4">
                We aim to respond to data subject rights requests within 30 days, as required by GDPR. Complex requests may take up to 90 days. We will keep you updated throughout the process.
              </p>
            </details>

            <details className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer">
              <summary className="font-semibold text-gray-900 text-lg">
                Is there a fee for submitting a request?
              </summary>
              <p className="text-gray-700 mt-4">
                No. Your first request each calendar year is free. Subsequent requests may incur a reasonable administrative fee unless they are demonstrably unfounded or excessive.
              </p>
            </details>

            <details className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer">
              <summary className="font-semibold text-gray-900 text-lg">
                Can I authorize someone else to make a request on my behalf?
              </summary>
              <p className="text-gray-700 mt-4">
                Yes. An authorized representative (like a lawyer or family member) can submit requests on your behalf. We may request proof of authorization and verification of your identity.
              </p>
            </details>

            <details className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer">
              <summary className="font-semibold text-gray-900 text-lg">
                Can I withdraw a request after submitting it?
              </summary>
              <p className="text-gray-700 mt-4">
                Yes. You can withdraw a request at any time by contacting us. However, once we've begun processing, withdrawal may not prevent processing.
              </p>
            </details>

            <details className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer">
              <summary className="font-semibold text-gray-900 text-lg">
                What if I'm not satisfied with the response?
              </summary>
              <p className="text-gray-700 mt-4">
                You have the right to lodge a complaint with your national data protection authority. You can also contact our Data Protection Officer at privacy@vibestrike.com.
              </p>
            </details>
          </div>
        </section>

        {/* Contact Information */}
        <section className="bg-blue-50 border border-blue-200 rounded-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Need Help?</h2>
          <p className="text-gray-700 mb-6">
            If you have questions about your rights or need assistance with your request:
          </p>
          <div className="space-y-4 text-gray-700">
            <div>
              <p className="font-semibold">Data Protection Officer</p>
              <p>Email: <a href="mailto:dpo@vibestrike.com" className="text-blue-600 hover:underline">dpo@vibestrike.com</a></p>
            </div>
            <div>
              <p className="font-semibold">Privacy Team</p>
              <p>Email: <a href="mailto:privacy@vibestrike.com" className="text-blue-600 hover:underline">privacy@vibestrike.com</a></p>
            </div>
            <div>
              <p className="font-semibold">General Support</p>
              <p><Link to="/contact" className="text-blue-600 hover:underline">Contact Us</Link></p>
            </div>
          </div>
        </section>

        {/* Related Links */}
        <section className="bg-gray-100 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Learn More</h3>
          <ul className="space-y-2">
            <li><Link to="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</Link></li>
            <li><Link to="/cookie-policy" className="text-blue-600 hover:underline">Cookie Policy</Link></li>
            <li><Link to="/terms-of-service" className="text-blue-600 hover:underline">Terms of Service</Link></li>
          </ul>
        </section>
      </div>
    </div>
  )
}

export default DataRights
