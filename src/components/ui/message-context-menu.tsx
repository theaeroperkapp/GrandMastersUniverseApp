'use client'

import { Copy, Reply, Forward, Trash2 } from 'lucide-react'
import { ReactionPicker } from './reaction-picker'
import { cn } from '@/lib/utils'

interface MessageContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  onClose: () => void
  onReact: (emoji: string) => void
  onCopy: () => void
  onReply?: () => void
  onDelete?: () => void
  existingReactions?: string[]
  isOwnMessage?: boolean
}

export function MessageContextMenu({
  isOpen,
  position,
  onClose,
  onReact,
  onCopy,
  onReply,
  onDelete,
  existingReactions = [],
  isOwnMessage = false,
}: MessageContextMenuProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
      />

      {/* Menu */}
      <div
        className="fixed z-50 animate-scale-in"
        style={{
          left: Math.min(position.x, window.innerWidth - 280),
          top: Math.min(position.y, window.innerHeight - 200),
        }}
      >
        {/* Reaction Picker */}
        <ReactionPicker
          onSelect={onReact}
          onClose={onClose}
          existingReactions={existingReactions}
          className="mb-2"
        />

        {/* Action Menu */}
        <div className="glass rounded-xl overflow-hidden shadow-lg min-w-[180px]">
          <button
            onClick={() => {
              onCopy()
              onClose()
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Copy className="h-4 w-4" />
            Copy
          </button>

          {onReply && (
            <button
              onClick={() => {
                onReply()
                onClose()
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-t border-gray-100 dark:border-gray-700"
            >
              <Reply className="h-4 w-4" />
              Reply
            </button>
          )}

          {isOwnMessage && onDelete && (
            <button
              onClick={() => {
                onDelete()
                onClose()
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-gray-100 dark:border-gray-700"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
        </div>
      </div>
    </>
  )
}
