'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  GraduationCap,
  ClipboardCheck,
  CalendarDays,
  DollarSign,
  FileText,
  Megaphone,
  Award,
  Settings,
  CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/database'

interface SidebarProps {
  role: UserRole
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()

  const ownerLinks: NavItem[] = [
    { href: '/owner', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { href: '/owner/approvals', label: 'Approvals', icon: <UserCheck className="h-5 w-5" /> },
    { href: '/owner/students', label: 'Students', icon: <GraduationCap className="h-5 w-5" /> },
    { href: '/owner/families', label: 'Families', icon: <Users className="h-5 w-5" /> },
    { href: '/owner/classes', label: 'Classes', icon: <Calendar className="h-5 w-5" /> },
    { href: '/owner/attendance', label: 'Attendance', icon: <ClipboardCheck className="h-5 w-5" /> },
    { href: '/owner/belts', label: 'Belt Ranks', icon: <Award className="h-5 w-5" /> },
    { href: '/owner/events', label: 'Events', icon: <CalendarDays className="h-5 w-5" /> },
    { href: '/owner/billing', label: 'Billing', icon: <DollarSign className="h-5 w-5" /> },
    { href: '/owner/contracts', label: 'Contracts', icon: <FileText className="h-5 w-5" /> },
    { href: '/owner/announcements', label: 'Announcements', icon: <Megaphone className="h-5 w-5" /> },
    { href: '/owner/staff', label: 'Staff', icon: <Users className="h-5 w-5" /> },
    { href: '/owner/subscription', label: 'Subscription', icon: <CreditCard className="h-5 w-5" /> },
    { href: '/owner/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
  ]

  const adminLinks: NavItem[] = [
    { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { href: '/admin/schools', label: 'Schools', icon: <GraduationCap className="h-5 w-5" /> },
    { href: '/admin/users', label: 'Users', icon: <Users className="h-5 w-5" /> },
    { href: '/admin/subdomains', label: 'Subdomains', icon: <Settings className="h-5 w-5" /> },
    { href: '/admin/platform-payments', label: 'Payments', icon: <DollarSign className="h-5 w-5" /> },
    { href: '/admin/analytics', label: 'Analytics', icon: <LayoutDashboard className="h-5 w-5" /> },
    { href: '/admin/user-activity', label: 'User Activity', icon: <ClipboardCheck className="h-5 w-5" /> },
    { href: '/admin/visitor-analytics', label: 'Visitors', icon: <Users className="h-5 w-5" /> },
    { href: '/admin/contact-submissions', label: 'Contacts', icon: <FileText className="h-5 w-5" /> },
    { href: '/admin/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
  ]

  const links = pathname.startsWith('/admin') ? adminLinks : ownerLinks

  if (role !== 'owner' && role !== 'admin') {
    return null
  }

  return (
    <aside className="hidden lg:block w-64 border-r bg-gray-50 min-h-[calc(100vh-4rem)]">
      <nav className="p-4 space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname === link.href
                ? 'bg-red-50 text-red-600'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
