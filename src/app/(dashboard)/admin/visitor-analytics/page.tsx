'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface VisitorSession {
  id: string
  visitor_id: string
  landing_page: string
  exit_page: string | null
  referrer: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  device_type: string | null
  browser: string | null
  country: string | null
  city: string | null
  started_at: string
  ended_at: string | null
}

export default function VisitorAnalyticsPage() {
  const [sessions, setSessions] = useState<VisitorSession[]>([])
  const [stats, setStats] = useState({
    totalVisitors: 0,
    uniqueVisitors: 0,
    avgDuration: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVisitorData()
  }, [])

  const fetchVisitorData = async () => {
    const supabase = createClient()

    const { data, count } = await supabase
      .from('visitor_sessions')
      .select('*', { count: 'exact' })
      .order('started_at', { ascending: false })
      .limit(50)

    if (data) {
      const sessions = data as unknown as VisitorSession[]
      setSessions(sessions)
      const uniqueIds = new Set(sessions.map(s => s.visitor_id))
      setStats({
        totalVisitors: count || 0,
        uniqueVisitors: uniqueIds.size,
        avgDuration: 0,
      })
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="p-8">Loading visitor analytics...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Visitor Analytics</h1>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Visits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalVisitors}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Unique Visitors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.uniqueVisitors}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0%</div>
          </CardContent>
        </Card>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No visitor data recorded yet. Visitor sessions will appear here as people visit your site.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Visitors</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium">Time</th>
                  <th className="text-left p-4 font-medium">Landing Page</th>
                  <th className="text-left p-4 font-medium">Source</th>
                  <th className="text-left p-4 font-medium">Device</th>
                  <th className="text-left p-4 font-medium">Location</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 text-gray-500">
                      {new Date(session.started_at).toLocaleString()}
                    </td>
                    <td className="p-4">{session.landing_page}</td>
                    <td className="p-4 text-gray-500">
                      {session.utm_source || session.referrer || 'Direct'}
                    </td>
                    <td className="p-4 text-gray-500">
                      {session.device_type || 'Unknown'}
                    </td>
                    <td className="p-4 text-gray-500">
                      {session.city && session.country
                        ? `${session.city}, ${session.country}`
                        : 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
