'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Activity,
  LogIn,
  Building2,
  CreditCard,
  Users,
  RefreshCw,
  Clock,
  Filter,
  ChevronDown,
} from 'lucide-react'

interface LogEntry {
  id: string
  type: 'login' | 'school_created' | 'payment' | 'user_registered' | 'subscription_change'
  message: string
  details: string
  user_name?: string
  timestamp: string
}

interface UserSession {
  id: string
  profile_id: string
  login_at: string
  ip_address: string | null
  device_type: string | null
  city: string | null
  country: string | null
  profile?: {
    full_name: string
    email: string
    role: string
  }
}

interface RecentSchool {
  id: string
  name: string
  created_at: string
  owner?: {
    full_name: string
    email: string
  }
}

interface RecentPayment {
  id: string
  amount: number
  status: string
  created_at: string
  school?: {
    name: string
  }
}

type LogFilter = 'all' | 'logins' | 'schools' | 'payments'

export default function SystemLogsPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [recentSchools, setRecentSchools] = useState<RecentSchool[]>([])
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState<LogFilter>('all')
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()
    const { data: authData } = await supabase.auth.getUser()

    if (!authData.user) return

    // Check if user is platform admin
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    const userProfileData = userProfile as { role: string } | null
    if (!userProfileData || userProfileData.role !== 'admin') {
      setLoading(false)
      return
    }

    await Promise.all([
      fetchSessions(supabase),
      fetchRecentSchools(supabase),
      fetchRecentPayments(supabase),
    ])

    setLoading(false)
  }

  const fetchSessions = async (supabase: ReturnType<typeof createClient>) => {
    const { data: sessionsData } = await supabase
      .from('user_sessions')
      .select('id, profile_id, login_at, ip_address, device_type, city, country')
      .order('login_at', { ascending: false })
      .limit(50)

    type SessionRow = { id: string; profile_id: string; login_at: string; ip_address: string | null; device_type: string | null; city: string | null; country: string | null }
    const typedSessions = sessionsData as SessionRow[] | null

    if (typedSessions && typedSessions.length > 0) {
      // Fetch profile info for sessions
      const profileIds = [...new Set(typedSessions.map(s => s.profile_id))]
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .in('id', profileIds)

      type ProfileRow = { id: string; full_name: string; email: string; role: string }
      const typedProfiles = profilesData as ProfileRow[] | null

      const profileMap = new Map(typedProfiles?.map(p => [p.id, p]) || [])

      const sessionsWithProfiles = typedSessions.map(session => ({
        ...session,
        profile: profileMap.get(session.profile_id) as UserSession['profile'],
      }))

      setSessions(sessionsWithProfiles)
    }
  }

  const fetchRecentSchools = async (supabase: ReturnType<typeof createClient>) => {
    const { data: schoolsData } = await supabase
      .from('schools')
      .select('id, name, created_at, owner_id')
      .order('created_at', { ascending: false })
      .limit(20)

    type SchoolRow = { id: string; name: string; created_at: string; owner_id: string }
    const typedSchools = schoolsData as SchoolRow[] | null

    if (typedSchools && typedSchools.length > 0) {
      const ownerIds = typedSchools.map(s => s.owner_id)
      const { data: ownersData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ownerIds)

      type OwnerRow = { id: string; full_name: string; email: string }
      const typedOwners = ownersData as OwnerRow[] | null

      const ownerMap = new Map(typedOwners?.map(o => [o.id, o]) || [])

      const schoolsWithOwners = typedSchools.map(school => ({
        ...school,
        owner: ownerMap.get(school.owner_id) as RecentSchool['owner'],
      }))

      setRecentSchools(schoolsWithOwners)
    }
  }

  const fetchRecentPayments = async (supabase: ReturnType<typeof createClient>) => {
    const { data: paymentsData } = await supabase
      .from('platform_payments')
      .select('id, amount, status, created_at, school_id')
      .order('created_at', { ascending: false })
      .limit(20)

    type PaymentRow = { id: string; amount: number; status: string; created_at: string; school_id: string }
    const typedPayments = paymentsData as PaymentRow[] | null

    if (typedPayments && typedPayments.length > 0) {
      const schoolIds = typedPayments.map(p => p.school_id)
      const { data: schoolsData } = await supabase
        .from('schools')
        .select('id, name')
        .in('id', schoolIds)

      type SchoolNameRow = { id: string; name: string }
      const typedSchoolNames = schoolsData as SchoolNameRow[] | null

      const schoolMap = new Map(typedSchoolNames?.map(s => [s.id, s]) || [])

      const paymentsWithSchools = typedPayments.map(payment => ({
        ...payment,
        school: schoolMap.get(payment.school_id) as RecentPayment['school'],
      }))

      setRecentPayments(paymentsWithSchools)
    }
  }

  // Combine all logs into a single timeline
  useEffect(() => {
    const allLogs: LogEntry[] = []

    // Add login logs
    sessions.forEach(session => {
      allLogs.push({
        id: `login-${session.id}`,
        type: 'login',
        message: `${session.profile?.full_name || 'Unknown user'} logged in`,
        details: `${session.profile?.role || 'user'} • ${session.city || 'Unknown location'}${session.country ? `, ${session.country}` : ''} • ${session.device_type || 'Unknown device'}`,
        user_name: session.profile?.full_name,
        timestamp: session.login_at,
      })
    })

    // Add school creation logs
    recentSchools.forEach(school => {
      allLogs.push({
        id: `school-${school.id}`,
        type: 'school_created',
        message: `New school registered: ${school.name}`,
        details: `Owner: ${school.owner?.full_name || 'Unknown'} (${school.owner?.email || 'No email'})`,
        user_name: school.owner?.full_name,
        timestamp: school.created_at,
      })
    })

    // Add payment logs
    recentPayments.forEach(payment => {
      allLogs.push({
        id: `payment-${payment.id}`,
        type: 'payment',
        message: `Payment ${payment.status}: $${(payment.amount / 100).toFixed(2)}`,
        details: `School: ${payment.school?.name || 'Unknown'}`,
        timestamp: payment.created_at,
      })
    })

    // Sort by timestamp descending
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    setLogs(allLogs)
  }, [sessions, recentSchools, recentPayments])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true
    if (filter === 'logins') return log.type === 'login'
    if (filter === 'schools') return log.type === 'school_created'
    if (filter === 'payments') return log.type === 'payment'
    return true
  })

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'login':
        return <LogIn className="h-4 w-4 text-blue-500" />
      case 'school_created':
        return <Building2 className="h-4 w-4 text-green-500" />
      case 'payment':
        return <CreditCard className="h-4 w-4 text-purple-500" />
      case 'user_registered':
        return <Users className="h-4 w-4 text-amber-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'login':
        return 'border-l-blue-500 bg-blue-50'
      case 'school_created':
        return 'border-l-green-500 bg-green-50'
      case 'payment':
        return 'border-l-purple-500 bg-purple-50'
      case 'user_registered':
        return 'border-l-amber-500 bg-amber-50'
      default:
        return 'border-l-gray-500 bg-gray-50'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            System Logs
          </h1>
          <p className="text-gray-500 text-sm">Monitor platform activity and events</p>
        </div>
        <div className="flex gap-3">
          {/* Filter Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {filter === 'all' ? 'All Activity' : filter.charAt(0).toUpperCase() + filter.slice(1)}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>

            {showFilterDropdown && (
              <div className="absolute top-full right-0 mt-1 w-40 bg-white border rounded-lg shadow-lg z-10">
                {(['all', 'logins', 'schools', 'payments'] as LogFilter[]).map(f => (
                  <button
                    key={f}
                    className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left text-sm ${
                      filter === f ? 'bg-gray-100 font-medium' : ''
                    }`}
                    onClick={() => {
                      setFilter(f)
                      setShowFilterDropdown(false)
                    }}
                  >
                    {f === 'all' && <Activity className="h-4 w-4" />}
                    {f === 'logins' && <LogIn className="h-4 w-4 text-blue-500" />}
                    {f === 'schools' && <Building2 className="h-4 w-4 text-green-500" />}
                    {f === 'payments' && <CreditCard className="h-4 w-4 text-purple-500" />}
                    <span className="capitalize">{f === 'all' ? 'All Activity' : f}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <LogIn className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Recent Logins</p>
                <p className="text-2xl font-bold">{sessions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Building2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">New Schools</p>
                <p className="text-2xl font-bold">{recentSchools.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CreditCard className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Payments</p>
                <p className="text-2xl font-bold">{recentPayments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Activity className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Events</p>
                <p className="text-2xl font-bold">{logs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No activity logs found</p>
          ) : (
            <div className="space-y-2">
              {filteredLogs.slice(0, 50).map(log => (
                <div
                  key={log.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${getLogColor(log.type)}`}
                >
                  <div className="mt-0.5">
                    {getLogIcon(log.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{log.message}</p>
                    <p className="text-xs text-gray-500 truncate">{log.details}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatTimestamp(log.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
