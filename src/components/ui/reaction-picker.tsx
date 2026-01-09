'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

const QUICK_REACTIONS = ['😂', '❤️', '👍', '😮', '😢', '🔥']

interface ReactionPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
  existingReactions?: string[]
  className?: string
}

export function ReactionPicker({
  onSelect,
  onClose,
  existingReactions = [],
  className,
}: ReactionPickerProps) {
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null)

  const handleSelect = (emoji: string) => {
    onSelect(emoji)
    onClose()
  }

  return (
    <div
      className={cn(
        'glass rounded-full px-2 py-1.5 flex items-center gap-1 shadow-lg animate-scale-in',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {QUICK_REACTIONS.map((emoji) => {
        const isSelected = existingReactions.includes(emoji)
        return (
          <button
            key={emoji}
            onClick={() => handleSelect(emoji)}
            onMouseEnter={() => setHoveredEmoji(emoji)}
            onMouseLeave={() => setHoveredEmoji(null)}
            className={cn(
              'w-9 h-9 flex items-center justify-center rounded-full transition-all duration-150',
              'hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-90',
              hoveredEmoji === emoji && 'scale-125 bg-gray-100 dark:bg-gray-700',
              isSelected && 'bg-red-100 dark:bg-red-900/30 ring-2 ring-red-400'
            )}
          >
            <span className="text-xl">{emoji}</span>
          </button>
        )
      })}
    </div>
  )
}

// Add scale-in animation to globals.css if not present
// @keyframes scale-in {
//   0% { transform: scale(0.8); opacity: 0; }
//   100% { transform: scale(1); opacity: 1; }
// }
// .animate-scale-in { animation: scale-in 0.15s ease-out; }
