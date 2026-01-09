'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Bell,
  Check,
  CheckCheck,
  User,
  Award,
  Calendar,
  CreditCard,
  MessageSquare,
  AlertCircle,
  Settings,
  X,
  Heart,
  MessageCircle,
  FileText,
  Info,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  related_id: string | null
}

interface NotificationDropdownProps {
  userId: string
  initialCount: number
}

const typeIcons: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  approval: { icon: User, color: 'text-blue-600', bg: 'bg-blue-100' },
  promotion: { icon: Award, color: 'text-amber-600', bg: 'bg-amber-100' },
  event: { icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-100' },
  payment: { icon: CreditCard, color: 'text-green-600', bg: 'bg-green-100' },
  payment_success: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  payment_failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
  message: { icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  announcement: { icon: Bell, color: 'text-red-600', bg: 'bg-red-100' },
  alert: { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-100' },
  system: { icon: Settings, color: 'text-gray-600', bg: 'bg-gray-100' },
  like: { icon: Heart, color: 'text-pink-600', bg: 'bg-pink-100' },
  comment: { icon: MessageCircle, color: 'text-teal-600', bg: 'bg-teal-100' },
  contract: { icon: FileText, color: 'text-cyan-600', bg: 'bg-cyan-100' },
  info: { icon: Info, color: 'text-sky-600', bg: 'bg-sky-100' },
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function NotificationDropdown({ userId, initialCount }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)
  const [bellShake, setBellShake] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(initialCount)

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  // Bell shake animation when count increases
  useEffect(() => {
    if (count > prevCountRef.current) {
      setBellShake(true)
      setTimeout(() => setBellShake(false), 800)
    }
    prevCountRef.current = count
  }, [count])

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('notification-dropdown')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setCount(prev => prev + 1)
          if (isOpen) {
            setNotifications(prev => [payload.new as Notification, ...prev.slice(0, 4)])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Notification
          if (updated.is_read) {
            setCount(prev => Math.max(0, prev - 1))
          }
          setNotifications(prev =>
            prev.map(n => (n.id === updated.id ? updated : n))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, isOpen])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const fetchNotifications = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (data) {
      setNotifications(data)
    }
    setLoading(false)
  }

  const markAsRead = async (id: string) => {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('notifications') as any)
      .update({ is_read: true })
      .eq('id', id)

    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    )
    setCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = async () => {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('notifications') as any)
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setCount(0)
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2 rounded-full hover:bg-gray-100 transition-colors',
          isOpen && 'bg-gray-100'
        )}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell
          className={cn(
            'h-5 w-5 text-gray-600 transition-transform',
            bellShake && 'animate-bell-shake'
          )}
        />
        {count > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 bg-red-600 text-white text-xs rounded-full flex items-center justify-center animate-badge-bounce shadow-glow-red">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 glass shadow-glass rounded-xl z-50 animate-dropdown overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full sm:hidden"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map(notification => {
                  const typeConfig = typeIcons[notification.type] || typeIcons.system
                  const Icon = typeConfig.icon

                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        'flex gap-3 p-4 hover:bg-gray-50/80 transition-colors cursor-pointer',
                        !notification.is_read && 'bg-blue-50/50'
                      )}
                      onClick={() => !notification.is_read && markAsRead(notification.id)}
                    >
                      {/* Icon */}
                      <div className={cn('p-2 rounded-full flex-shrink-0', typeConfig.bg)}>
                        <Icon className={cn('h-4 w-4', typeConfig.color)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            'text-sm',
                            !notification.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                          )}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5 animate-online" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {getRelativeTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="block w-full py-3 text-center text-sm font-medium text-red-600 hover:bg-gray-50 transition-colors"
            >
              View All Notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
