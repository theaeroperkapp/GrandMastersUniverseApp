'use client'

import { useState, useRef, useCallback, ReactNode } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SwipeableItemProps {
  children: ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  leftAction?: {
    icon?: ReactNode
    label: string
    color: string
    bgColor: string
  }
  rightAction?: {
    icon?: ReactNode
    label: string
    color: string
    bgColor: string
  }
  threshold?: number
  className?: string
  disabled?: boolean
}

const DEFAULT_LEFT_ACTION = {
  icon: <Trash2 className="h-5 w-5" />,
  label: 'Delete',
  color: 'text-white',
  bgColor: 'bg-red-500',
}

const DEFAULT_RIGHT_ACTION = {
  icon: <Check className="h-5 w-5" />,
  label: 'Read',
  color: 'text-white',
  bgColor: 'bg-green-500',
}

export function SwipeableItem({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction = DEFAULT_LEFT_ACTION,
  rightAction = DEFAULT_RIGHT_ACTION,
  threshold = 80,
  className,
  disabled = false,
}: SwipeableItemProps) {
  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startX = useRef(0)
  const currentX = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return
    startX.current = e.touches[0].clientX
    currentX.current = e.touches[0].clientX
    setIsDragging(true)
  }, [disabled])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || disabled) return

    currentX.current = e.touches[0].clientX
    const diff = currentX.current - startX.current

    // Limit the swipe distance
    const maxSwipe = 120
    const limitedDiff = Math.max(-maxSwipe, Math.min(maxSwipe, diff))

    // Only allow swipe in directions with actions
    if (diff < 0 && !onSwipeLeft) return
    if (diff > 0 && !onSwipeRight) return

    setTranslateX(limitedDiff)
  }, [isDragging, disabled, onSwipeLeft, onSwipeRight])

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || disabled) return

    setIsDragging(false)
    const diff = currentX.current - startX.current

    if (diff < -threshold && onSwipeLeft) {
      // Animate out then call action
      setTranslateX(-200)
      setTimeout(() => {
        onSwipeLeft()
        setTranslateX(0)
      }, 200)
    } else if (diff > threshold && onSwipeRight) {
      // Animate out then call action
      setTranslateX(200)
      setTimeout(() => {
        onSwipeRight()
        setTranslateX(0)
      }, 200)
    } else {
      // Snap back
      setTranslateX(0)
    }
  }, [isDragging, disabled, threshold, onSwipeLeft, onSwipeRight])

  const showLeftAction = translateX < -20 && onSwipeLeft
  const showRightAction = translateX > 20 && onSwipeRight

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
    >
      {/* Left action (swipe left to reveal) */}
      {onSwipeLeft && (
        <div
          className={cn(
            'absolute inset-y-0 right-0 flex items-center justify-end px-4 transition-opacity',
            leftAction.bgColor,
            leftAction.color,
            showLeftAction ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: Math.abs(Math.min(translateX, 0)) + 20 }}
        >
          <div className="flex items-center gap-2">
            {leftAction.icon}
            <span className="font-medium text-sm">{leftAction.label}</span>
          </div>
        </div>
      )}

      {/* Right action (swipe right to reveal) */}
      {onSwipeRight && (
        <div
          className={cn(
            'absolute inset-y-0 left-0 flex items-center justify-start px-4 transition-opacity',
            rightAction.bgColor,
            rightAction.color,
            showRightAction ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: Math.max(translateX, 0) + 20 }}
        >
          <div className="flex items-center gap-2">
            {rightAction.icon}
            <span className="font-medium text-sm">{rightAction.label}</span>
          </div>
        </div>
      )}

      {/* Main content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={cn(
          'relative bg-white dark:bg-gray-900 touch-pan-y',
          isDragging ? '' : 'transition-transform duration-200'
        )}
        style={{ transform: `translateX(${translateX}px)` }}
      >
        {children}
      </div>
    </div>
  )
}
