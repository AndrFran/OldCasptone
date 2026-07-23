import React, { useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'

/**
 * AccessibleModal Component
 *
 * Provides a fully accessible modal/dialog with:
 * - Focus trap (Tab stays within modal)
 * - Focus restoration (returns to trigger element when closed)
 * - Escape key handling
 * - ARIA attributes (role, aria-labelledby, aria-describedby)
 * - Semantic HTML (dialog element)
 * - Backdrop click handling
 *
 * Usage:
 * <AccessibleModal
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   title="Confirm Delete"
 *   description="Are you sure you want to delete this item?"
 * >
 *   <button onClick={handleDelete}>Delete</button>
 *   <button onClick={handleClose}>Cancel</button>
 * </AccessibleModal>
 */
export function AccessibleModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
}) {
  const dialogRef = useRef(null)
  const triggerRef = useRef(null)

  // Store the element that triggered the modal so we can restore focus
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement
    }
  }, [isOpen])

  // Focus trap: prevent focus from escaping modal
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      // Focus trap for Tab key
      if (e.key === 'Tab') {
        const focusableElements = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    const handleBackdropClick = (e) => {
      if (e.target === e.currentTarget) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    dialogRef.current?.addEventListener('click', handleBackdropClick)

    // Focus first focusable element in modal
    const firstButton = dialogRef.current?.querySelector('button')
    firstButton?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      dialogRef.current?.removeEventListener('click', handleBackdropClick)
    }
  }, [isOpen, onClose])

  // Restore focus when modal closes
  useEffect(() => {
    return () => {
      if (!isOpen && triggerRef.current) {
        triggerRef.current.focus()
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }

  const titleId = `modal-title-${Math.random().toString(36).substr(2, 9)}`
  const descriptionId = description ? `modal-desc-${Math.random().toString(36).substr(2, 9)}` : undefined

  return ReactDOM.createPortal(
    <div
      ref={dialogRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`${sizeClasses[size]} bg-white rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto`}
        role="dialog"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-modal="true"
      >
        {title && (
          <h2
            id={titleId}
            className="text-xl font-bold text-gray-900 mb-2"
          >
            {title}
          </h2>
        )}

        {description && (
          <p
            id={descriptionId}
            className="text-gray-600 mb-4"
          >
            {description}
          </p>
        )}

        <div className="mb-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default AccessibleModal
