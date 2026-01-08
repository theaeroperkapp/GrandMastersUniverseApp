'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/avatar'
import {
  Swords,
  Bell,
  MessageSquare,
  Menu,
  X,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Loader2,
  BookOpen,
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

export function Navbar({ user, unreadNotifications: initialUnreadNotifications, unreadMessages }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [notificationCount, setNotificationCount] = useState(initialUnreadNotifications)
  const pathname = usePathname()
  const router = useRouter()

  // Close all menus on route change
  useEffect(() => {
    setIsMenuOpen(false)
    setIsProfileOpen(false)
  }, [pathname])

  // Subscribe to real-time notification updates
  useEffect(() => {
    const supabase = createClient()

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // New notification received - increment count
          setNotificationCount(prev => prev + 1)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Notification updated - refresh count if marked as read
          const newData = payload.new as { is_read: boolean }
          if (newData.is_read) {
            setNotificationCount(prev => Math.max(0, prev - 1))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Notification deleted - decrement if it was unread
          // We can't know if it was unread, so refresh from server
          fetchNotificationCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user.id])

  // Fetch current notification count
  const fetchNotificationCount = async () => {
    const supabase = createClient()
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    setNotificationCount(count || 0)
  }

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
    <nav className="sticky top-0 z-40 bg-white border-b shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/feed" className="flex items-center gap-2">
            <Swords className="h-8 w-8 text-red-600" />
            <span className="text-xl font-bold hidden sm:block">GMU</span>
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
                    : 'text-gray-600'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Messages */}
            <Link
              href="/messages"
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <MessageSquare className="h-5 w-5 text-gray-600" />
              {unreadMessages > 0 && (
                <span className="absolute top-0 right-0 h-4 w-4 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </Link>

            {/* Notifications */}
            <Link
              href="/notifications"
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Bell className="h-5 w-5 text-gray-600" />
              {notificationCount > 0 && (
                <span className="absolute top-0 right-0 h-4 w-4 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </Link>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={toggleProfileMenu}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                aria-expanded={isProfileOpen}
                aria-haspopup="true"
              >
                <Avatar
                  src={user.avatar_url}
                  name={user.full_name}
                  size="sm"
                />
                <ChevronDown className={cn(
                  'h-4 w-4 text-gray-600 hidden sm:block transition-transform',
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
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50 py-1">
                    <div className="px-4 py-2 border-b">
                      <p className="font-medium text-sm truncate">{user.full_name}</p>
                      <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                    </div>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <Link
                      href="/my-classes"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <BookOpen className="h-4 w-4" />
                      My Classes
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 disabled:opacity-50"
                    >
                      {isLoggingOut ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                      {isLoggingOut ? 'Logging out...' : 'Log Out'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              aria-expanded={isMenuOpen}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'block py-2 text-sm font-medium transition-colors',
                  pathname === link.href || pathname.startsWith(link.href + '/')
                    ? 'text-red-600'
                    : 'text-gray-600'
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
