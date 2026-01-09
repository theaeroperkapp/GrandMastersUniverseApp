'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart3,
  Users,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  Download,
} from 'lucide-react'

interface AttendanceStats {
  totalCheckins: number
  uniqueStudents: number
  avgPerDay: number
  byDay: { day: string; count: number }[]
  byClass: { name: string; count: number }[]
}

interface MemberStats {
  totalMembers: number
  students: number
  parents: number
  newThisMonth: number
  pendingApprovals: number
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month')
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null)
  const [memberStats, setMemberStats] = useState<MemberStats | null>(null)

  useEffect(() => {
    fetchData()
  }, [dateRange])

  const fetchData = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: authData } = await supabase.auth.getUser()

    if (!authData.user) return

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', authData.user.id)
      .single()

    const userProfileData = userProfile as { school_id: string | null } | null
    if (!userProfileData?.school_id) {
      setLoading(false)
      return
    }

    const schoolId = userProfileData.school_id

    // Calculate date range
    const now = new Date()
    let startDate: Date
    switch (dateRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
    }

    // Fetch attendance records
    const { data: attendanceData } = await supabase
      .from('attendance_records')
      .select('id, check_in_time, student_id, class_session:class_sessions(class:classes(name))')
      .eq('school_id', schoolId)
      .gte('check_in_time', startDate.toISOString())
      .order('check_in_time', { ascending: false })

    const typedAttendance = (attendanceData || []) as {
      id: string
      check_in_time: string
      student_id: string
      class_session?: { class?: { name: string } }
    }[]

    // Calculate attendance stats
    const uniqueStudentIds = new Set(typedAttendance.map(a => a.student_id))
    const dayCount = dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 365

    // Group by day
    const byDayMap = new Map<string, number>()
    typedAttendance.forEach(record => {
      const day = new Date(record.check_in_time).toLocaleDateString('en-US', { weekday: 'short' })
      byDayMap.set(day, (byDayMap.get(day) || 0) + 1)
    })

    // Group by class
    const byClassMap = new Map<string, number>()
    typedAttendance.forEach(record => {
      const className = record.class_session?.class?.name || 'General'
      byClassMap.set(className, (byClassMap.get(className) || 0) + 1)
    })

    setAttendanceStats({
      totalCheckins: typedAttendance.length,
      uniqueStudents: uniqueStudentIds.size,
      avgPerDay: Math.round(typedAttendance.length / dayCount * 10) / 10,
      byDay: Array.from(byDayMap.entries()).map(([day, count]) => ({ day, count })),
      byClass: Array.from(byClassMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    })

    // Fetch member stats
    const { data: membersData } = await supabase
      .from('profiles')
      .select('id, role, is_approved, created_at')
      .eq('school_id', schoolId)
      .in('role', ['student', 'parent'])

    const typedMembers = (membersData || []) as {
      id: string
      role: string
      is_approved: boolean
      created_at: string
    }[]

    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    setMemberStats({
      totalMembers: typedMembers.filter(m => m.is_approved).length,
      students: typedMembers.filter(m => m.role === 'student' && m.is_approved).length,
      parents: typedMembers.filter(m => m.role === 'parent' && m.is_approved).length,
      newThisMonth: typedMembers.filter(m =>
        m.is_approved && new Date(m.created_at) >= monthAgo
      ).length,
      pendingApprovals: typedMembers.filter(m => !m.is_approved).length,
    })

    setLoading(false)
  }

  const exportCSV = () => {
    if (!attendanceStats) return

    let csv = 'Report Type,Metric,Value\n'
    csv += `Attendance,Total Check-ins,${attendanceStats.totalCheckins}\n`
    csv += `Attendance,Unique Students,${attendanceStats.uniqueStudents}\n`
    csv += `Attendance,Avg Per Day,${attendanceStats.avgPerDay}\n`

    if (memberStats) {
      csv += `Members,Total Members,${memberStats.totalMembers}\n`
      csv += `Members,Students,${memberStats.students}\n`
      csv += `Members,Parents,${memberStats.parents}\n`
      csv += `Members,New This Month,${memberStats.newThisMonth}\n`
    }

    csv += '\nClass,Check-ins\n'
    attendanceStats.byClass.forEach(({ name, count }) => {
      csv += `${name},${count}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Attendance and membership analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border dark:border-gray-700 overflow-hidden">
            {(['week', 'month', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  dateRange === range
                    ? 'bg-red-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Check-ins</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{attendanceStats?.totalCheckins || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Users className="h-5 w-5 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Students</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{attendanceStats?.uniqueStudents || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-300" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg/Day</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{attendanceStats?.avgPerDay || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-300" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">New Members</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{memberStats?.newThisMonth || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Attendance by Class */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Attendance by Class
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceStats?.byClass.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No attendance data yet</p>
            ) : (
              <div className="space-y-3">
                {attendanceStats?.byClass.map(({ name, count }) => {
                  const maxCount = Math.max(...(attendanceStats?.byClass.map(c => c.count) || [1]))
                  const percentage = (count / maxCount) * 100

                  return (
                    <div key={name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-900 dark:text-white">{name}</span>
                        <span className="text-gray-500 dark:text-gray-400">{count} check-ins</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Membership Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Membership Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">Total Members</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">{memberStats?.totalMembers || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">Students</span>
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{memberStats?.students || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">Parents</span>
                <span className="text-xl font-bold text-green-600 dark:text-green-400">{memberStats?.parents || 0}</span>
              </div>
              {(memberStats?.pendingApprovals || 0) > 0 && (
                <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-400">Pending Approvals</span>
                  <span className="text-xl font-bold text-amber-600 dark:text-amber-400">{memberStats?.pendingApprovals}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Attendance by Day */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Attendance by Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceStats?.byDay.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No attendance data yet</p>
            ) : (
              <div className="flex items-end justify-between gap-2 h-48">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => {
                  const dayData = attendanceStats?.byDay.find(d => d.day === day)
                  const count = dayData?.count || 0
                  const maxCount = Math.max(...(attendanceStats?.byDay.map(d => d.count) || [1]))
                  const height = maxCount > 0 ? (count / maxCount) * 100 : 0

                  return (
                    <div key={day} className="flex-1 flex flex-col items-center">
                      <div className="w-full flex flex-col items-center justify-end h-36">
                        <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">{count}</span>
                        <div
                          className="w-full bg-red-500 rounded-t transition-all"
                          style={{ height: `${Math.max(height, 4)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">{day}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
