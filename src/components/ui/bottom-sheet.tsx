'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  /** Height as percentage of viewport (0.3 = 30%, 0.5 = 50%, 0.9 = 90%) */
  snapPoints?: number[]
  /** Show drag handle */
  showHandle?: boolean
  /** Show close button */
  showCloseButton?: boolean
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  snapPoints = [0.5, 0.9],
  showHandle = true,
  showCloseButton = true,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [currentSnap, setCurrentSnap] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)

  const height = snapPoints[currentSnap]

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true)
    setStartY(e.touches[0].clientY)
    setCurrentY(0)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return
    const diff = e.touches[0].clientY - startY
    // Only allow dragging down
    if (diff > 0) {
      setCurrentY(diff)
    }
  }, [isDragging, startY])

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)

    // If dragged more than 100px down, close or snap to lower point
    if (currentY > 100) {
      if (currentSnap > 0) {
        setCurrentSnap(currentSnap - 1)
      } else {
        onClose()
      }
    }
    setCurrentY(0)
  }, [isDragging, currentY, currentSnap, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl animate-slide-up',
          'flex flex-col',
          !isDragging && 'transition-[height,transform] duration-300 ease-out'
        )}
        style={{
          height: `${height * 100}vh`,
          transform: currentY > 0 ? `translateY(${currentY}px)` : undefined,
        }}
      >
        {/* Drag handle area */}
        <div
          className="shrink-0 touch-manipulation"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {showHandle && (
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
          )}

          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between px-4 pb-3 border-b">
              <h2 className="text-lg font-semibold">{title}</h2>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 rounded-lg hover:bg-gray-100 touch-manipulation"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain safe-bottom">
          {children}
        </div>
      </div>
    </div>
  )
}
