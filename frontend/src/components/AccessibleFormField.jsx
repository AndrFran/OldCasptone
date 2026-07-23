import React from 'react'

/**
 * AccessibleFormField Component
 *
 * Provides fully accessible form inputs with:
 * - Proper label associations
 * - Error messages with aria-describedby
 * - Required field indicators
 * - Focus management
 * - Help text support
 *
 * Usage:
 * <AccessibleFormField
 *   label="Email Address"
 *   id="email"
 *   type="email"
 *   value={email}
 *   onChange={(e) => setEmail(e.target.value)}
 *   required={true}
 *   error={emailError}
 *   helpText="We'll never share your email"
 * />
 */
export function AccessibleFormField({
  label,
  id,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  disabled = false,
  error,
  helpText,
  autoComplete,
  min,
  max,
  pattern,
  className = '',
  inputClassName = '',
}) {
  const errorId = error ? `${id}-error` : undefined
  const helpId = helpText ? `${id}-help` : undefined
  const describedBy = [errorId, helpId].filter(Boolean).join(' ')

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {required && <span className="text-red-600 ml-1" aria-label="required">*</span>}
      </label>

      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        min={min}
        max={max}
        pattern={pattern}
        aria-invalid={!!error}
        aria-describedby={describedBy || undefined}
        className={`input-field ${
          error ? 'border-red-500 focus:ring-red-500' : ''
        } ${disabled ? 'bg-gray-50 opacity-50 cursor-not-allowed' : ''} ${inputClassName}`}
      />

      {error && (
        <p
          id={errorId}
          className="mt-1 text-sm text-red-600 flex items-center"
          role="alert"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18.101 12.93a1 1 0 00-1.414-1.414L10 14.586l-6.687-6.687a1 1 0 00-1.414 1.414l7.778 7.778a1 1 0 001.414 0l9.192-9.192z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}

      {helpText && !error && (
        <p
          id={helpId}
          className="mt-1 text-sm text-gray-500"
        >
          {helpText}
        </p>
      )}
    </div>
  )
}

export default AccessibleFormField
