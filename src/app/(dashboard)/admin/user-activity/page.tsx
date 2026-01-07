'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface UserSession {
  id: string
  profile_id: string
  login_at: string
  logout_at: string | null
  ip_address: string | null
  device_type: string | null
  city: string | null
  country: string | null
  profile?: {
    full_name: string
    email: string
  }
}

export default function UserActivityPage() {
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from('user_sessions')
      .select(`
        *,
        profile:profiles(full_name, email)
      `)
      .order('login_at', { ascending: false })
      .limit(50)

    if (data) {
      setSessions(data as unknown as UserSession[])
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="p-8">Loading activity...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">User Activity</h1>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No user activity recorded yet. Sessions will appear here as users log in.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium">User</th>
                  <th className="text-left p-4 font-medium">Login Time</th>
                  <th className="text-left p-4 font-medium">Device</th>
                  <th className="text-left p-4 font-medium">Location</th>
                  <th className="text-left p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div>{session.profile?.full_name || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">{session.profile?.email}</div>
                    </td>
                    <td className="p-4 text-gray-500">
                      {new Date(session.login_at).toLocaleString()}
                    </td>
                    <td className="p-4 text-gray-500">
                      {session.device_type || 'Unknown'}
                    </td>
                    <td className="p-4 text-gray-500">
                      {session.city && session.country
                        ? `${session.city}, ${session.country}`
                        : session.ip_address || 'Unknown'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        session.logout_at ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {session.logout_at ? 'Ended' : 'Active'}
                      </span>
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
