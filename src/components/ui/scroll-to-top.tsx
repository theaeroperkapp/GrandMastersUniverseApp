'use client'

import { useEffect, useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScrollToTopProps {
  /** Scroll threshold to show the button (in pixels) */
  threshold?: number
  /** Position from bottom (in pixels) - accounts for bottom nav */
  bottomOffset?: number
  /** Custom className */
  className?: string
}

export function ScrollToTop({
  threshold = 400,
  bottomOffset = 80,
  className,
}: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > threshold)
    }

    // Check initial state
    toggleVisibility()

    window.addEventListener('scroll', toggleVisibility, { passive: true })
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [threshold])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  if (!isVisible) return null

  return (
    <button
      onClick={scrollToTop}
      className={cn(
        'fixed right-4 z-40 h-11 w-11 rounded-full bg-white border border-gray-200 shadow-lg',
        'flex items-center justify-center',
        'hover:bg-gray-50 active:scale-95 transition-all duration-200',
        'touch-manipulation animate-fade-in',
        'md:h-10 md:w-10',
        className
      )}
      style={{ bottom: bottomOffset }}
      aria-label="Scroll to top"
    >
      <ChevronUp className="h-5 w-5 text-gray-600" />
    </button>
  )
}
