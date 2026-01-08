'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  GraduationCap,
  ClipboardCheck,
  ClipboardList,
  CalendarDays,
  DollarSign,
  FileText,
  Megaphone,
  Award,
  Settings,
  CreditCard,
  Menu,
  X,
  BarChart3,
  Mail,
  Activity,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
    { href: '/owner/reports', label: 'Reports', icon: <BarChart3 className="h-5 w-5" /> },
    { href: '/owner/email-templates', label: 'Email Blast', icon: <Mail className="h-5 w-5" /> },
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
    { href: '/admin/waitlist', label: 'Waitlist', icon: <ClipboardList className="h-5 w-5" /> },
    { href: '/admin/email-templates', label: 'Email Blast', icon: <Mail className="h-5 w-5" /> },
    { href: '/admin/logs', label: 'System Logs', icon: <Activity className="h-5 w-5" /> },
    { href: '/admin/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
  ]

  const links = pathname.startsWith('/admin') ? adminLinks : ownerLinks

  if (role !== 'owner' && role !== 'admin') {
    return null
  }

  // Only show sidebar on owner/admin pages
  const showSidebar = pathname.startsWith('/owner') || pathname.startsWith('/admin')
  if (!showSidebar) {
    return null
  }

  return (
    <>
      {/* Mobile Menu Button - Fixed at bottom */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-50 bg-red-600 text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition-colors"
        aria-label="Toggle navigation menu"
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">
            {pathname.startsWith('/admin') ? 'Admin Menu' : 'Owner Menu'}
          </h2>
        </div>
        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-5rem)]">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
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

      {/* Desktop Sidebar */}
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
    </>
  )
}
