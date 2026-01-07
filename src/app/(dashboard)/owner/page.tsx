import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Users,
  UserCheck,
  Calendar,
  GraduationCap,
  DollarSign,
  CalendarDays,
  TrendingUp,
} from 'lucide-react'

interface ProfileWithSchool {
  id: string
  role: string
  school_id: string | null
  schools: {
    name: string
    subscription_status: string
    trial_ends_at: string | null
  } | null
}
export default async function OwnerDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, schools(*)')
    .eq('id', user.id)
    .single()

  const profileData = profile as ProfileWithSchool | null

  if (!profileData || (profileData.role !== 'owner' && profileData.role !== 'admin')) {
    redirect('/feed')
  }

  const schoolId = profileData.school_id

  if (!schoolId) {
    redirect('/feed')
  }

  // Get stats
  const [
    { count: totalStudents },
    { count: pendingApprovals },
    { count: totalFamilies },
    { count: totalClasses },
    { count: upcomingEvents },
    { data: recentPayments },
  ] = await Promise.all([
    supabase
      .from('student_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('is_approved', false),
    supabase
      .from('families')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId),
    supabase
      .from('class_schedules')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('is_active', true),
    supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('is_published', true)
      .gte('start_date', new Date().toISOString()),
    supabase
      .from('custom_charges')
      .select('amount, status')
      .eq('school_id', schoolId)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const payments = recentPayments as Array<{ amount: number; status: string }> | null
  const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

  const stats = [
    {
      title: 'Total Students',
      value: totalStudents || 0,
      icon: <GraduationCap className="h-6 w-6" />,
      href: '/owner/students',
      color: 'text-blue-600 bg-blue-100',
    },
    {
      title: 'Pending Approvals',
      value: pendingApprovals || 0,
      icon: <UserCheck className="h-6 w-6" />,
      href: '/owner/approvals',
      color: 'text-orange-600 bg-orange-100',
      highlight: (pendingApprovals || 0) > 0,
    },
    {
      title: 'Families',
      value: totalFamilies || 0,
      icon: <Users className="h-6 w-6" />,
      href: '/owner/families',
      color: 'text-purple-600 bg-purple-100',
    },
    {
      title: 'Active Classes',
      value: totalClasses || 0,
      icon: <Calendar className="h-6 w-6" />,
      href: '/owner/classes',
      color: 'text-green-600 bg-green-100',
    },
    {
      title: 'Upcoming Events',
      value: upcomingEvents || 0,
      icon: <CalendarDays className="h-6 w-6" />,
      href: '/owner/events',
      color: 'text-pink-600 bg-pink-100',
    },
    {
      title: 'Recent Revenue',
      value: `$${(totalRevenue / 100).toFixed(0)}`,
      icon: <DollarSign className="h-6 w-6" />,
      href: '/owner/billing',
      color: 'text-emerald-600 bg-emerald-100',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Welcome back to {profileData.schools?.name || 'your school'}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className={`hover:shadow-md transition-shadow ${stat.highlight ? 'ring-2 ring-orange-500' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.color}`}>
                    {stat.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link
              href="/owner/students"
              className="p-4 rounded-lg border hover:bg-gray-50 text-center"
            >
              <GraduationCap className="h-6 w-6 mx-auto text-gray-600" />
              <p className="mt-2 text-sm font-medium">Add Student</p>
            </Link>
            <Link
              href="/owner/classes"
              className="p-4 rounded-lg border hover:bg-gray-50 text-center"
            >
              <Calendar className="h-6 w-6 mx-auto text-gray-600" />
              <p className="mt-2 text-sm font-medium">Schedule Class</p>
            </Link>
            <Link
              href="/owner/events"
              className="p-4 rounded-lg border hover:bg-gray-50 text-center"
            >
              <CalendarDays className="h-6 w-6 mx-auto text-gray-600" />
              <p className="mt-2 text-sm font-medium">Create Event</p>
            </Link>
            <Link
              href="/owner/announcements"
              className="p-4 rounded-lg border hover:bg-gray-50 text-center"
            >
              <Users className="h-6 w-6 mx-auto text-gray-600" />
              <p className="mt-2 text-sm font-medium">Announcement</p>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Status */}
      {profileData.schools && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium capitalize">{profileData.schools.subscription_status}</p>
                {profileData.schools.trial_ends_at && (
                  <p className="text-sm text-gray-500">
                    Trial ends: {new Date(profileData.schools.trial_ends_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Link
                href="/owner/subscription"
                className="text-red-600 hover:underline text-sm"
              >
                Manage Subscription
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
