'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import { SwipeableItem } from '@/components/ui/swipeable-item'
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  ChevronRight,
  User,
  Award,
  Calendar,
  CreditCard,
  MessageSquare,
  AlertCircle,
  Settings,
  Sparkles,
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
  title: string
  message: string
  content?: string
  type: string
  is_read: boolean
  created_at: string
  link?: string
}

const ITEMS_PER_PAGE = 10

const typeIcons: Record<string, { icon: React.ElementType; color: string; bg: string; gradient: string }> = {
  approval: { icon: User, color: 'text-blue-600', bg: 'bg-blue-100', gradient: 'from-blue-400 to-blue-600' },
  promotion: { icon: Award, color: 'text-amber-600', bg: 'bg-amber-100', gradient: 'from-amber-400 to-orange-500' },
  event: { icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-100', gradient: 'from-purple-400 to-purple-600' },
  payment: { icon: CreditCard, color: 'text-green-600', bg: 'bg-green-100', gradient: 'from-green-400 to-emerald-500' },
  payment_success: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', gradient: 'from-green-400 to-emerald-500' },
  payment_failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', gradient: 'from-red-400 to-red-600' },
  message: { icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-100', gradient: 'from-indigo-400 to-indigo-600' },
  announcement: { icon: Bell, color: 'text-red-600', bg: 'bg-red-100', gradient: 'from-red-400 to-red-600' },
  alert: { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-100', gradient: 'from-orange-400 to-orange-600' },
  system: { icon: Settings, color: 'text-gray-600', bg: 'bg-gray-100', gradient: 'from-gray-400 to-gray-600' },
  like: { icon: Heart, color: 'text-pink-600', bg: 'bg-pink-100', gradient: 'from-pink-400 to-pink-600' },
  comment: { icon: MessageCircle, color: 'text-teal-600', bg: 'bg-teal-100', gradient: 'from-teal-400 to-teal-600' },
  contract: { icon: FileText, color: 'text-cyan-600', bg: 'bg-cyan-100', gradient: 'from-cyan-400 to-cyan-600' },
  info: { icon: Info, color: 'text-sky-600', bg: 'bg-sky-100', gradient: 'from-sky-400 to-sky-600' },
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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: diffDays > 365 ? 'numeric' : undefined })
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const router = useRouter()

  const fetchNotifications = useCallback(async (page: number) => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    // Get total count
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    setTotalCount(count || 0)

    // Get paginated data
    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (data) {
      setNotifications(data as Notification[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchNotifications(currentPage)
  }, [currentPage, fetchNotifications])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const markAsRead = async (id: string) => {
    const supabase = createClient()

    await supabase
      .from('notifications')
      .update({ is_read: true } as never)
      .eq('id', id)

    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, is_read: true } : n
    ))
  }

  const markAllAsRead = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    await supabase
      .from('notifications')
      .update({ is_read: true } as never)
      .eq('user_id', user.id)

    setNotifications(notifications.map(n => ({ ...n, is_read: true })))
  }

  const deleteNotification = async (id: string) => {
    const supabase = createClient()

    await supabase
      .from('notifications')
      .delete()
      .eq('id', id)

    // Refresh to get updated count and pagination
    setTotalCount(prev => prev - 1)
    setNotifications(notifications.filter(n => n.id !== id))

    // If page is now empty, go to previous page
    if (notifications.length === 1 && currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass rounded-xl p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="h-12 w-12 rounded-xl bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1">
                  <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                  <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg shadow-red-500/25">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
              {totalCount > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {unreadCount > 0 ? (
                    <span className="text-red-600 dark:text-red-400 font-medium">{unreadCount} unread</span>
                  ) : (
                    'All caught up!'
                  )}
                  {' '}of {totalCount} total
                </p>
              )}
            </div>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={markAllAsRead}
            className="btn-gradient-red text-white shadow-lg shadow-red-200 hover:shadow-red-300 transition-all"
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="glass border-0 overflow-hidden">
          <CardContent className="p-12 text-center">
            <div className="relative">
              <div className="h-20 w-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                <Bell className="h-10 w-10 text-gray-400" />
              </div>
              <Sparkles className="absolute top-0 right-1/3 h-5 w-5 text-amber-400 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">All caught up!</h3>
            <p className="text-gray-500 dark:text-gray-400">No notifications to show right now</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile swipe hint */}
          <div className="sm:hidden mb-4 px-4 py-2 glass rounded-lg text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Swipe right to mark as read • Swipe left to delete
            </p>
          </div>

          <div className="space-y-3">
            {notifications.map((notification, index) => {
              const typeConfig = typeIcons[notification.type] || typeIcons.system
              const Icon = typeConfig.icon

              return (
                <SwipeableItem
                  key={notification.id}
                  onSwipeRight={!notification.is_read ? () => markAsRead(notification.id) : undefined}
                  onSwipeLeft={() => deleteNotification(notification.id)}
                  rightAction={{
                    icon: <Check className="h-5 w-5" />,
                    label: 'Read',
                    color: 'text-white',
                    bgColor: 'bg-green-500',
                  }}
                  leftAction={{
                    icon: <Trash2 className="h-5 w-5" />,
                    label: 'Delete',
                    color: 'text-white',
                    bgColor: 'bg-red-500',
                  }}
                  disabled={notification.is_read && !notification.link}
                  className="rounded-xl"
                >
                  <div
                    style={{ animationDelay: `${index * 50}ms` }}
                    className={cn(
                      'glass rounded-xl overflow-hidden transition-all duration-300 animate-slide-up',
                      notification.link && 'cursor-pointer hover:shadow-lg hover:scale-[1.01]',
                      !notification.is_read && 'ring-2 ring-red-100 dark:ring-red-900 bg-red-50/30 dark:bg-red-900/20'
                    )}
                    onClick={() => {
                      if (notification.link) {
                        markAsRead(notification.id)
                        router.push(notification.link)
                      }
                    }}
                  >
                    <div className="p-4">
                      <div className="flex gap-4">
                        {/* Icon */}
                        <div className={cn(
                          'flex-shrink-0 p-3 rounded-xl bg-gradient-to-br shadow-lg',
                          typeConfig.gradient
                        )}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {!notification.is_read && (
                                  <span className="w-2 h-2 bg-red-500 rounded-full animate-online flex-shrink-0" />
                                )}
                                <h3 className={cn(
                                  'font-semibold truncate',
                                  !notification.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                                )}>
                                  {notification.title}
                                </h3>
                              </div>
                              <p className="text-gray-600 dark:text-gray-400 mt-1 line-clamp-2 text-sm">
                                {notification.message || notification.content}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-medium">
                                {getRelativeTime(notification.created_at)}
                              </p>
                            </div>

                            {/* Actions - shown on desktop */}
                            <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                              {notification.link && (
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                              )}
                              {!notification.is_read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    markAsRead(notification.id)
                                  }}
                                  className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600 rounded-lg transition-colors"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteNotification(notification.id)
                                }}
                                className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Mobile - just show chevron for linked items */}
                            <div className="sm:hidden flex items-center flex-shrink-0">
                              {notification.link && (
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar for unread */}
                    {!notification.is_read && (
                      <div className="h-0.5 bg-gradient-to-r from-red-500 via-red-400 to-transparent" />
                    )}
                  </div>
                </SwipeableItem>
              )
            })}
          </div>

          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              totalItems={totalCount}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </div>
        </>
      )}
    </div>
  )
}
