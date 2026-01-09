'use client'

import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  name?: string
  className?: string
}

export function TypingIndicator({ name, className }: TypingIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center gap-1 px-4 py-3 bg-gray-100 rounded-2xl rounded-bl-sm">
        <span className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
        <span className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
        <span className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
      </div>
      {name && (
        <span className="text-xs text-gray-500">{name} is typing</span>
      )}
    </div>
  )
}
