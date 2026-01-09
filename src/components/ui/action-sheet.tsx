'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ActionSheetOption {
  label: string
  onClick: () => void
  variant?: 'default' | 'destructive'
  icon?: React.ReactNode
  disabled?: boolean
}

interface ActionSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  options: ActionSheetOption[]
  cancelLabel?: string
}

export function ActionSheet({
  isOpen,
  onClose,
  title,
  description,
  options,
  cancelLabel = 'Cancel',
}: ActionSheetProps) {
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 p-2 safe-bottom animate-slide-up">
        {/* Options container */}
        <div className="bg-white rounded-xl overflow-hidden">
          {/* Header */}
          {(title || description) && (
            <div className="px-4 py-3 text-center border-b bg-gray-50">
              {title && (
                <p className="font-medium text-gray-900">{title}</p>
              )}
              {description && (
                <p className="text-sm text-gray-500 mt-0.5">{description}</p>
              )}
            </div>
          )}

          {/* Options */}
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => {
                if (!option.disabled) {
                  option.onClick()
                  onClose()
                }
              }}
              disabled={option.disabled}
              className={cn(
                'w-full px-4 py-3.5 text-center text-lg flex items-center justify-center gap-2',
                'border-b last:border-b-0 active:bg-gray-50 touch-manipulation',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                option.variant === 'destructive'
                  ? 'text-red-600'
                  : 'text-blue-600'
              )}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>

        {/* Cancel button */}
        <button
          onClick={onClose}
          className="w-full mt-2 px-4 py-3.5 bg-white rounded-xl text-center text-lg font-medium text-blue-600 active:bg-gray-50 touch-manipulation"
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  )
}
