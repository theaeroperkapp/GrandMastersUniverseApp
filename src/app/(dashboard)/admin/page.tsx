import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  GraduationCap,
  DollarSign,
  TrendingUp,
  Globe,
  FileText,
  Activity,
  Clock,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const profileData = profile as { role: string } | null
  if (!profileData || profileData.role !== 'admin') {
    redirect('/feed')
  }

  // Get platform stats
  const [
    { count: totalUsers },
    { count: totalSchools },
    { count: activeSchools },
    { count: totalStudents },
    { data: recentPayments },
    { count: pendingContacts },
    { count: waitlistCount },
    { count: pendingWaitlist },
    { data: recentSchools },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('schools').select('*', { count: 'exact', head: true }),
    supabase
      .from('schools')
      .select('*', { count: 'exact', head: true })
      .in('subscription_status', ['active', 'trial']),
    supabase.from('student_profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('platform_payments')
      .select('amount, status')
      .eq('status', 'succeeded')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('contact_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new'),
    supabase.from('waitlist').select('*', { count: 'exact', head: true }),
    supabase.from('waitlist').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase
      .from('schools')
      .select('id, name, subdomain, subscription_status, created_at, owner:profiles!schools_owner_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const payments = recentPayments as Array<{ amount: number; status: string }> | null
  const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

  const stats = [
    {
      title: 'Total Schools',
      value: totalSchools || 0,
      icon: <GraduationCap className="h-6 w-6" />,
      href: '/admin/schools',
      color: 'text-blue-600 bg-blue-100',
    },
    {
      title: 'Active Schools',
      value: activeSchools || 0,
      icon: <Activity className="h-6 w-6" />,
      href: '/admin/schools',
      color: 'text-green-600 bg-green-100',
    },
    {
      title: 'Total Users',
      value: totalUsers || 0,
      icon: <Users className="h-6 w-6" />,
      href: '/admin/users',
      color: 'text-purple-600 bg-purple-100',
    },
    {
      title: 'Total Students',
      value: totalStudents || 0,
      icon: <Users className="h-6 w-6" />,
      href: '/admin/users',
      color: 'text-indigo-600 bg-indigo-100',
    },
    {
      title: 'Platform Revenue',
      value: formatCurrency(totalRevenue),
      icon: <DollarSign className="h-6 w-6" />,
      href: '/admin/platform-payments',
      color: 'text-emerald-600 bg-emerald-100',
    },
    {
      title: 'Waitlist',
      value: pendingWaitlist ? `${pendingWaitlist} pending` : (waitlistCount || 0),
      icon: pendingWaitlist ? <Clock className="h-6 w-6" /> : <FileText className="h-6 w-6" />,
      href: '/admin/waitlist',
      color: pendingWaitlist ? 'text-yellow-600 bg-yellow-100' : 'text-orange-600 bg-orange-100',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-600">Platform overview and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow">
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

      {/* Alerts */}
      {(pendingWaitlist || 0) > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-yellow-600" />
                <p className="font-medium text-yellow-800">
                  {pendingWaitlist} pending waitlist application{(pendingWaitlist || 0) > 1 ? 's' : ''} awaiting review
                </p>
              </div>
              <Link
                href="/admin/waitlist"
                className="text-yellow-600 hover:underline text-sm font-medium"
              >
                Review now
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {(pendingContacts || 0) > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-orange-600" />
                <p className="font-medium text-orange-800">
                  {pendingContacts} new contact submission{(pendingContacts || 0) > 1 ? 's' : ''}
                </p>
              </div>
              <Link
                href="/admin/contact-submissions"
                className="text-orange-600 hover:underline text-sm"
              >
                View all
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Schools */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Recent Schools
            </CardTitle>
            <Link href="/admin/schools" className="text-sm text-red-600 hover:underline">
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentSchools?.map((school: any) => (
              <div
                key={school.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
              >
                <div>
                  <p className="font-medium">{school.name}</p>
                  <p className="text-sm text-gray-500">
                    {school.subdomain}.grandmastersuniverse.com
                  </p>
                  <p className="text-xs text-gray-400">
                    Owner: {school.owner?.full_name || 'Unknown'}
                  </p>
                </div>
                <Badge
                  variant={
                    school.subscription_status === 'active'
                      ? 'success'
                      : school.subscription_status === 'trial'
                      ? 'warning'
                      : 'secondary'
                  }
                >
                  {school.subscription_status}
                </Badge>
              </div>
            ))}
            {(!recentSchools || recentSchools.length === 0) && (
              <p className="text-center text-gray-500 py-4">No schools yet</p>
            )}
          </div>
        </CardContent>
      </Card>

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
              href="/admin/schools"
              className="p-4 rounded-lg border hover:bg-gray-50 text-center"
            >
              <GraduationCap className="h-6 w-6 mx-auto text-gray-600" />
              <p className="mt-2 text-sm font-medium">Add School</p>
            </Link>
            <Link
              href="/admin/subdomains"
              className="p-4 rounded-lg border hover:bg-gray-50 text-center"
            >
              <Globe className="h-6 w-6 mx-auto text-gray-600" />
              <p className="mt-2 text-sm font-medium">Subdomains</p>
            </Link>
            <Link
              href="/admin/analytics"
              className="p-4 rounded-lg border hover:bg-gray-50 text-center"
            >
              <TrendingUp className="h-6 w-6 mx-auto text-gray-600" />
              <p className="mt-2 text-sm font-medium">Analytics</p>
            </Link>
            <Link
              href="/admin/user-activity"
              className="p-4 rounded-lg border hover:bg-gray-50 text-center"
            >
              <Activity className="h-6 w-6 mx-auto text-gray-600" />
              <p className="mt-2 text-sm font-medium">User Activity</p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
