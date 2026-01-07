'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSchools: 0,
    activeSubscriptions: 0,
    pendingApprovals: 0,
    totalStudents: 0,
    totalFamilies: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    const supabase = createClient()

    const [users, schools, pendingUsers, students, families] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }),
      supabase.from('schools').select('id', { count: 'exact' }),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('is_approved', false),
      supabase.from('student_profiles').select('id', { count: 'exact' }),
      supabase.from('families').select('id', { count: 'exact' }),
    ])

    setStats({
      totalUsers: users.count || 0,
      totalSchools: schools.count || 0,
      activeSubscriptions: schools.count || 0,
      pendingApprovals: pendingUsers.count || 0,
      totalStudents: students.count || 0,
      totalFamilies: families.count || 0,
    })
    setLoading(false)
  }

  if (loading) {
    return <div className="p-8">Loading analytics...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Platform Analytics</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Schools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalSchools}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeSubscriptions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingApprovals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Families</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalFamilies}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <p>Revenue charts will be displayed here once schools start subscribing.</p>
            <p className="text-sm mt-2">Monthly subscription: $99/school</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
