import React from 'react'

/**
 * SkipLink Component
 *
 * Provides a keyboard-accessible skip link that allows users to:
 * - Jump directly to main content (bypassing navigation)
 * - Only visible when focused via keyboard
 * - Appears at the top of the page
 * - Essential for WCAG compliance
 *
 * Usage:
 * Place at the very beginning of your main layout:
 * <SkipLink />
 */
export function SkipLink() {
  const handleSkipClick = (e) => {
    e.preventDefault()
    const mainContent = document.querySelector('main')
    if (mainContent) {
      mainContent.focus()
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <a
      href="#main-content"
      onClick={handleSkipClick}
      className="
        absolute
        top-0
        left-0
        -translate-y-12
        px-4
        py-2
        bg-blue-600
        text-white
        rounded
        font-medium
        z-[9999]
        focus:translate-y-0
        focus:outline-none
        focus:ring-2
        focus:ring-offset-2
        focus:ring-blue-600
      "
    >
      Skip to main content
    </a>
  )
}

export default SkipLink
