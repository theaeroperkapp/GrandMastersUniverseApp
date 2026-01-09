'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Avatar } from '@/components/ui/avatar'
import type { UserRole } from '@/types/database'

interface User {
  id: string
  full_name: string
  avatar_url: string | null
  role: UserRole
}

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  onMentionsChange?: (mentions: string[]) => void
  placeholder?: string
  className?: string
  maxLength?: number
  multiline?: boolean
  rows?: number
  disabled?: boolean
}

export function MentionInput({
  value,
  onChange,
  onMentionsChange,
  placeholder,
  className = '',
  maxLength,
  multiline = false,
  rows = 1,
  disabled = false,
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<User[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Extract mentions from text
  const extractMentions = useCallback((text: string): string[] => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
    const mentions: string[] = []
    let match
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[2]) // The user ID
    }
    return mentions
  }, [])

  // Search for users
  const searchUsers = useCallback(async (query: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const users = await response.json()
        setSuggestions(users)
        setSelectedIndex(0)
      }
    } catch (error) {
      console.error('Error searching users:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart || 0

    onChange(newValue)

    // Check if we're in a mention context
    const textBeforeCursor = newValue.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)
      // Check if there's a space or newline between @ and cursor (would end the mention)
      if (!/[\s\n]/.test(textAfterAt) && textAfterAt.length <= 20) {
        setMentionStartIndex(lastAtIndex)
        setMentionSearch(textAfterAt)
        setShowSuggestions(true)
        searchUsers(textAfterAt)
        return
      }
    }

    setShowSuggestions(false)
    setMentionStartIndex(-1)
    setMentionSearch('')
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % suggestions.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)
        break
      case 'Enter':
        if (showSuggestions) {
          e.preventDefault()
          selectUser(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        break
      case 'Tab':
        if (showSuggestions) {
          e.preventDefault()
          selectUser(suggestions[selectedIndex])
        }
        break
    }
  }

  // Select a user from suggestions
  const selectUser = (user: User) => {
    if (mentionStartIndex === -1) return

    const beforeMention = value.slice(0, mentionStartIndex)
    const afterMention = value.slice(mentionStartIndex + mentionSearch.length + 1)

    // Format: @[Name](userId)
    const mention = `@${user.full_name} `
    const newValue = beforeMention + mention + afterMention

    onChange(newValue)
    setShowSuggestions(false)
    setMentionStartIndex(-1)
    setMentionSearch('')

    // Update mentions list
    const mentions = extractMentions(newValue)
    mentions.push(user.id)
    onMentionsChange?.(mentions)

    // Focus back on input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        const newCursorPos = beforeMention.length + mention.length
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Scroll selected item into view
  useEffect(() => {
    if (suggestionsRef.current && showSuggestions) {
      const selectedEl = suggestionsRef.current.children[selectedIndex] as HTMLElement
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex, showSuggestions])

  const inputProps = {
    ref: inputRef as any,
    value,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    placeholder,
    maxLength,
    disabled,
    className: `w-full ${className}`,
  }

  return (
    <div className="relative">
      {multiline ? (
        <textarea {...inputProps} rows={rows} />
      ) : (
        <input type="text" {...inputProps} />
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {isLoading ? (
            <div className="p-3 text-center text-sm text-gray-500">
              <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
              No users found
            </div>
          ) : (
            suggestions.map((user, index) => (
              <button
                key={user.id}
                type="button"
                onClick={() => selectUser(user)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  index === selectedIndex ? 'bg-gray-100 dark:bg-gray-800' : ''
                }`}
              >
                <Avatar
                  src={user.avatar_url}
                  name={user.full_name}
                  size="sm"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.full_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {user.role}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// Helper to render text with highlighted mentions
export function renderTextWithMentions(text: string): React.ReactNode {
  if (!text) return null

  // Simple approach: highlight @Name patterns
  const parts = text.split(/(@\w+(?:\s\w+)?)/g)

  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span key={index} className="text-red-600 font-medium">
          {part}
        </span>
      )
    }
    return part
  })
}
