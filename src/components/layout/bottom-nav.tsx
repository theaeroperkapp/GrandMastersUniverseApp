'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Home,
  Calendar,
  MessageSquare,
  Bell,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  icon: typeof Home
  label: string
  badge?: number
}

interface BottomNavProps {
  unreadMessages?: number
  unreadNotifications?: number
}

export function BottomNav({ unreadMessages = 0, unreadNotifications = 0 }: BottomNavProps) {
  const pathname = usePathname()

  const navItems: NavItem[] = [
    { href: '/feed', icon: Home, label: 'Home' },
    { href: '/schedule', icon: Calendar, label: 'Schedule' },
    { href: '/messages', icon: MessageSquare, label: 'Messages', badge: unreadMessages },
    { href: '/notifications', icon: Bell, label: 'Alerts', badge: unreadNotifications },
    { href: '/profile', icon: User, label: 'Profile' },
  ]

  // Don't show on owner/admin dashboard pages (they have sidebar)
  const hideOnPaths = ['/owner', '/admin', '/login', '/register', '/onboarding']
  const shouldHide = hideOnPaths.some(path => pathname.startsWith(path))

  if (shouldHide) {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden safe-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center w-full h-full gap-0.5 text-xs transition-colors touch-manipulation',
                isActive
                  ? 'text-red-600'
                  : 'text-gray-500 active:text-gray-900'
              )}
            >
              <div className="relative">
                <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
                {(item.badge ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                    {item.badge! > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={cn('text-[10px]', isActive && 'font-medium')}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
