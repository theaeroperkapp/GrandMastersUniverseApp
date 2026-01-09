'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'

interface PageTransitionProps {
  children: React.ReactNode
  /** Transition type */
  type?: 'fade' | 'slide' | 'none'
  /** Duration in milliseconds */
  duration?: number
}

export function PageTransition({
  children,
  type = 'fade',
  duration = 150,
}: PageTransitionProps) {
  const pathname = usePathname()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [displayChildren, setDisplayChildren] = useState(children)
  const previousPathname = useRef(pathname)

  useEffect(() => {
    // Skip transition on first render
    if (previousPathname.current === pathname) return

    setIsTransitioning(true)

    // Wait for exit animation
    const exitTimer = setTimeout(() => {
      setDisplayChildren(children)

      // Wait for enter animation
      const enterTimer = setTimeout(() => {
        setIsTransitioning(false)
      }, duration)

      return () => clearTimeout(enterTimer)
    }, duration)

    previousPathname.current = pathname

    return () => clearTimeout(exitTimer)
  }, [pathname, children, duration])

  // Update children when not transitioning (for same-page updates)
  useEffect(() => {
    if (!isTransitioning && previousPathname.current === pathname) {
      setDisplayChildren(children)
    }
  }, [children, isTransitioning, pathname])

  if (type === 'none') {
    return <>{children}</>
  }

  const transitionStyles = {
    fade: {
      className: cn(
        'transition-opacity',
        isTransitioning ? 'opacity-0' : 'opacity-100'
      ),
      style: { transitionDuration: `${duration}ms` },
    },
    slide: {
      className: cn(
        'transition-all',
        isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      ),
      style: { transitionDuration: `${duration}ms` },
    },
  }

  const { className, style } = transitionStyles[type]

  return (
    <div className={className} style={style}>
      {displayChildren}
    </div>
  )
}

/**
 * Simple fade-in animation for page content
 */
export function FadeIn({
  children,
  delay = 0,
  duration = 300,
  className,
}: {
  children: React.ReactNode
  delay?: number
  duration?: number
  className?: string
}) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      className={cn(
        'transition-all',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  )
}

/**
 * Stagger children animations
 */
export function StaggerChildren({
  children,
  staggerDelay = 50,
  initialDelay = 0,
  className,
}: {
  children: React.ReactNode[]
  staggerDelay?: number
  initialDelay?: number
  className?: string
}) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <FadeIn key={index} delay={initialDelay + index * staggerDelay}>
          {child}
        </FadeIn>
      ))}
    </div>
  )
}
