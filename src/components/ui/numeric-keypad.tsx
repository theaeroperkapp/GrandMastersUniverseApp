'use client'

import { useState, useEffect, useCallback } from 'react'
import { Delete, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NumericKeypadProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  maxLength?: number
  error?: boolean
  className?: string
}

export function NumericKeypad({
  value,
  onChange,
  onSubmit,
  maxLength = 4,
  error = false,
  className,
}: NumericKeypadProps) {
  const [pressedKey, setPressedKey] = useState<string | null>(null)

  const handleKeyPress = useCallback((key: string) => {
    setPressedKey(key)
    setTimeout(() => setPressedKey(null), 150)

    if (key === 'backspace') {
      onChange(value.slice(0, -1))
    } else if (key === 'submit') {
      if (value.length >= maxLength) {
        onSubmit()
      }
    } else if (value.length < maxLength) {
      onChange(value + key)
    }
  }, [value, onChange, onSubmit, maxLength])

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key)
      } else if (e.key === 'Backspace') {
        handleKeyPress('backspace')
      } else if (e.key === 'Enter' && value.length >= maxLength) {
        handleKeyPress('submit')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyPress, value.length, maxLength])

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['backspace', '0', 'submit'],
  ]

  return (
    <div className={cn('w-full max-w-xs mx-auto', className)}>
      {/* PIN Dots */}
      <div className="flex justify-center gap-4 mb-8">
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-4 h-4 rounded-full transition-all duration-200',
              i < value.length
                ? error
                  ? 'bg-red-500 scale-110'
                  : 'bg-red-600 scale-110 shadow-glow-red'
                : 'bg-gray-200',
              error && i < value.length && 'animate-shake'
            )}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3">
        {keys.flat().map((key) => {
          const isBackspace = key === 'backspace'
          const isSubmit = key === 'submit'
          const isPressed = pressedKey === key
          const isDisabled = isSubmit && value.length < maxLength

          return (
            <button
              key={key}
              onClick={() => handleKeyPress(key)}
              disabled={isDisabled}
              className={cn(
                'relative h-16 rounded-2xl font-semibold text-xl transition-all duration-150 press-scale touch-manipulation',
                isSubmit
                  ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'
                  : 'glass-subtle hover:bg-gray-100 text-gray-800',
                isPressed && !isSubmit && 'scale-95 bg-gray-200',
                isPressed && isSubmit && 'scale-95'
              )}
            >
              {/* Ripple effect */}
              {isPressed && (
                <span className="absolute inset-0 rounded-2xl bg-black/10 animate-ping" />
              )}

              {isBackspace ? (
                <Delete className="w-6 h-6 mx-auto" />
              ) : isSubmit ? (
                <Check className="w-6 h-6 mx-auto" />
              ) : (
                key
              )}
            </button>
          )
        })}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-center text-red-500 text-sm mt-4 animate-shake">
          Invalid PIN. Please try again.
        </p>
      )}
    </div>
  )
}

// Add shake animation for error state
const shakeKeyframes = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}
.animate-shake {
  animation: shake 0.5s ease-in-out;
}
`

// Inject styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = shakeKeyframes
  document.head.appendChild(style)
}
