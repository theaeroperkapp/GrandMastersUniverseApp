'use client'

import { useState, useRef, useCallback } from 'react'
import { Loader2, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  /** Threshold in pixels to trigger refresh */
  threshold?: number
  /** Disable pull to refresh */
  disabled?: boolean
}

export function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  disabled = false,
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const canPull = useRef(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return

    const container = containerRef.current
    if (!container) return

    // Only enable pull if at the top of scroll
    if (container.scrollTop === 0) {
      startY.current = e.touches[0].clientY
      canPull.current = true
    }
  }, [disabled, isRefreshing])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!canPull.current || disabled || isRefreshing) return

    const currentY = e.touches[0].clientY
    const diff = currentY - startY.current

    if (diff > 0) {
      setIsPulling(true)
      // Apply resistance - the more you pull, the harder it gets
      const resistance = Math.min(diff * 0.5, threshold * 1.5)
      setPullDistance(resistance)
    }
  }, [disabled, isRefreshing, threshold])

  const handleTouchEnd = useCallback(async () => {
    if (!canPull.current || disabled) return

    canPull.current = false

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(threshold * 0.6) // Keep some visible during refresh

      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
        setIsPulling(false)
      }
    } else {
      setPullDistance(0)
      setIsPulling(false)
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh, disabled])

  const progress = Math.min(pullDistance / threshold, 1)

  return (
    <div
      ref={containerRef}
      className="relative h-full overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute left-1/2 -translate-x-1/2 flex items-center justify-center transition-opacity z-10',
          (isPulling || isRefreshing) ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          top: Math.max(pullDistance - 40, -40),
        }}
      >
        <div className={cn(
          'h-10 w-10 rounded-full bg-white shadow-md flex items-center justify-center',
          isRefreshing && 'animate-pulse'
        )}>
          {isRefreshing ? (
            <Loader2 className="h-5 w-5 text-red-600 animate-spin" />
          ) : (
            <ArrowDown
              className={cn(
                'h-5 w-5 text-gray-600 transition-transform duration-200',
                progress >= 1 && 'rotate-180'
              )}
              style={{
                transform: `rotate(${progress * 180}deg)`,
              }}
            />
          )}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${isRefreshing ? threshold * 0.6 : pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  )
}
