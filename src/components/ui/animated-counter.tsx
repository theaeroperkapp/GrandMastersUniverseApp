'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedCounterProps {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
}

export function AnimatedCounter({
  value,
  duration = 1000,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const previousValue = useRef(0)
  const startTime = useRef<number | null>(null)
  const animationFrame = useRef<number | null>(null)

  useEffect(() => {
    const startValue = previousValue.current
    const endValue = value
    const diff = endValue - startValue

    const animate = (timestamp: number) => {
      if (!startTime.current) {
        startTime.current = timestamp
      }

      const progress = Math.min((timestamp - startTime.current) / duration, 1)

      // Easing function (easeOutExpo)
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)

      const current = startValue + diff * eased
      setDisplayValue(current)

      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(animate)
      } else {
        previousValue.current = endValue
        startTime.current = null
      }
    }

    animationFrame.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current)
      }
    }
  }, [value, duration])

  const formattedValue = displayValue.toFixed(decimals)

  return (
    <span className={cn('tabular-nums', className)}>
      {prefix}{formattedValue}{suffix}
    </span>
  )
}

// Currency-specific variant
interface AnimatedCurrencyProps {
  cents: number
  duration?: number
  className?: string
}

export function AnimatedCurrency({
  cents,
  duration = 1200,
  className,
}: AnimatedCurrencyProps) {
  const dollars = cents / 100

  return (
    <AnimatedCounter
      value={dollars}
      duration={duration}
      prefix="$"
      decimals={2}
      className={className}
    />
  )
}
