'use client'

import { cn } from '@/lib/utils'

interface Reaction {
  emoji: string
  count: number
  hasReacted: boolean
}

interface ReactionPillProps {
  reactions: Reaction[]
  onToggle: (emoji: string) => void
  className?: string
}

export function ReactionPill({ reactions, onToggle, className }: ReactionPillProps) {
  if (reactions.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {reactions.map(({ emoji, count, hasReacted }) => (
        <button
          key={emoji}
          onClick={(e) => {
            e.stopPropagation()
            onToggle(emoji)
          }}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all',
            'hover:scale-105 active:scale-95',
            hasReacted
              ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 ring-1 ring-red-300 dark:ring-red-700'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          )}
        >
          <span>{emoji}</span>
          {count > 1 && <span>{count}</span>}
        </button>
      ))}
    </div>
  )
}

// Helper function to aggregate reactions
export function aggregateReactions(
  reactions: Array<{ emoji: string; user_id: string }>,
  currentUserId: string
): Reaction[] {
  const emojiMap = new Map<string, { count: number; hasReacted: boolean }>()

  reactions.forEach(({ emoji, user_id }) => {
    const existing = emojiMap.get(emoji) || { count: 0, hasReacted: false }
    emojiMap.set(emoji, {
      count: existing.count + 1,
      hasReacted: existing.hasReacted || user_id === currentUserId,
    })
  })

  return Array.from(emojiMap.entries()).map(([emoji, data]) => ({
    emoji,
    ...data,
  }))
}
