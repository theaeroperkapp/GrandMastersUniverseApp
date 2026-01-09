'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/avatar'
import { NotificationDropdown } from '@/components/ui/notification-dropdown'
import {
  Swords,
  MessageSquare,
  Menu,
  X,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Loader2,
  BookOpen,
  Users,
  TrendingUp,
  CreditCard,
  HelpCircle,
  Flame,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/database'
import toast from 'react-hot-toast'

interface NavbarProps {
  user: {
    id: string
    full_name: string
    avatar_url: string | null
    role: UserRole
    school_id: string | null
  }
  unreadNotifications: number
  unreadMessages: number
}

export function Navbar({ user, unreadNotifications: initialUnreadNotifications, unreadMessages: initialUnreadMessages }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [messageShake, setMessageShake] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(initialUnreadMessages)
  const pathname = usePathname()
  const router = useRouter()

  // Real-time subscription for unread messages
  useEffect(() => {
    const supabase = createClient()

    // Fetch initial unread count
    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*, conversations!inner(*)', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', user.id)
        .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`, { foreignTable: 'conversations' })

      setUnreadMessages(count || 0)
    }

    // Subscribe to new messages
    const channel = supabase
      .channel('navbar-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMsg = payload.new as { sender_id: string; conversation_id: string }
          // Only count if message is from someone else
          if (newMsg.sender_id !== user.id) {
            // Check if this message is in a conversation the user is part of
            const { data: convo } = await supabase
              .from('conversations')
              .select('id')
              .eq('id', newMsg.conversation_id)
              .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
              .single()

            if (convo) {
              setUnreadMessages(prev => prev + 1)
              setMessageShake(true)
              setTimeout(() => setMessageShake(false), 800)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        () => {
          // Refetch count when messages are updated (e.g., marked as read)
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user.id])

  // Close all menus on route change
  useEffect(() => {
    setIsMenuOpen(false)
    setIsProfileOpen(false)
  }, [pathname])

  // Handle Escape key to close menus
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsMenuOpen(false)
      setIsProfileOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      toast.success('Logged out successfully')
      router.push('/login')
      router.refresh()
    } catch {
      toast.error('Failed to log out')
      setIsLoggingOut(false)
    }
  }

  // Toggle mobile menu and close profile dropdown
  const toggleMobileMenu = () => {
    setIsProfileOpen(false)
    setIsMenuOpen(!isMenuOpen)
  }

  // Toggle profile dropdown and close mobile menu
  const toggleProfileMenu = () => {
    setIsMenuOpen(false)
    setIsProfileOpen(!isProfileOpen)
  }

  const navLinks = [
    { href: '/feed', label: 'Feed' },
    { href: '/schedule', label: 'Schedule' },
    { href: '/events', label: 'Events' },
    { href: '/announcements', label: 'Announcements' },
  ]

  if (user.role === 'owner' || user.role === 'admin') {
    navLinks.push({ href: '/owner', label: 'Dashboard' })
  }

  if (user.role === 'admin') {
    navLinks.push({ href: '/admin', label: 'Admin' })
  }

  return (
    <nav className="sticky top-0 z-40 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/feed" className="flex items-center gap-2">
            <Swords className="h-8 w-8 text-red-600" />
            <span className="text-xl font-bold hidden sm:block text-gray-900 dark:text-white">GMU</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-red-600',
                  pathname === link.href || pathname.startsWith(link.href + '/')
                    ? 'text-red-600'
                    : 'text-gray-600 dark:text-gray-300'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Messages */}
            <Link
              href="/messages"
              className="relative flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-manipulation"
              aria-label="Messages"
            >
              <MessageSquare className={cn(
                "h-5 w-5 text-gray-600 dark:text-gray-300 transition-transform",
                messageShake && "animate-bell-shake"
              )} />
              {unreadMessages > 0 && (
                <span className={cn(
                  "absolute top-1 right-1 h-5 w-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-medium",
                  messageShake && "animate-badge-bounce"
                )}>
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </Link>

            {/* Notifications - Premium Dropdown */}
            <NotificationDropdown
              userId={user.id}
              initialCount={initialUnreadNotifications}
            />

            {/* Profile Dropdown - Premium */}
            <div className="relative">
              <button
                onClick={toggleProfileMenu}
                className={cn(
                  'flex items-center gap-2 p-1 rounded-full transition-all',
                  isProfileOpen ? 'bg-gray-100 dark:bg-gray-800 ring-2 ring-red-100 dark:ring-red-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
                aria-expanded={isProfileOpen}
                aria-haspopup="true"
              >
                <Avatar
                  src={user.avatar_url}
                  name={user.full_name}
                  size="sm"
                />
                <ChevronDown className={cn(
                  'h-4 w-4 text-gray-600 dark:text-gray-300 hidden sm:block transition-transform duration-200',
                  isProfileOpen && 'rotate-180'
                )} />
              </button>

              {isProfileOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProfileOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg rounded-xl z-50 overflow-hidden animate-dropdown">
                    {/* User Header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={user.avatar_url}
                          name={user.full_name}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{user.full_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-lg">
                          <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        Profile
                      </Link>
                      <Link
                        href="/my-classes"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <div className="p-1.5 bg-purple-100 dark:bg-purple-900 rounded-lg">
                          <BookOpen className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        My Classes
                      </Link>
                      <Link
                        href="/my-progress"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <div className="p-1.5 bg-green-100 dark:bg-green-900 rounded-lg">
                          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        My Progress
                      </Link>
                      <Link
                        href="/my-family"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <div className="p-1.5 bg-amber-100 dark:bg-amber-900 rounded-lg">
                          <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        My Family
                      </Link>
                      <Link
                        href="/payments"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                          <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        Payments
                      </Link>

                      <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

                      <Link
                        href="/help"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                          <HelpCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </div>
                        Help
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                          <Settings className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </div>
                        Settings
                      </Link>

                      <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-50"
                      >
                        <div className="p-1.5 bg-red-100 dark:bg-red-900 rounded-lg">
                          {isLoggingOut ? (
                            <Loader2 className="h-4 w-4 text-red-600 dark:text-red-400 animate-spin" />
                          ) : (
                            <LogOut className="h-4 w-4 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        {isLoggingOut ? 'Logging out...' : 'Log Out'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation"
              aria-expanded={isMenuOpen}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6 text-gray-700 dark:text-gray-200" />
              ) : (
                <Menu className="h-6 w-6 text-gray-700 dark:text-gray-200" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-800 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'block py-2 text-sm font-medium transition-colors',
                  pathname === link.href || pathname.startsWith(link.href + '/')
                    ? 'text-red-600'
                    : 'text-gray-600 dark:text-gray-300'
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
