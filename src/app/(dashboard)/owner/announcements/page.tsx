'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Announcement {
  id: string
  title: string
  content: string
  category: string
  priority: string
  is_published: boolean
  scheduled_for: string | null
  created_at: string
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    const supabase = createClient()
    const { data: profile } = await supabase.auth.getUser()

    if (!profile.user) return

    const { data: userProfileData } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', profile.user.id)
      .single()

    const userProfile = userProfileData as unknown as { school_id: string | null } | null
    if (!userProfile?.school_id) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('announcements')
      .select('*')
      .eq('school_id', userProfile.school_id)
      .order('created_at', { ascending: false })

    if (data) {
      setAnnouncements(data)
    }
    setLoading(false)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800'
      case 'important':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'schedule':
        return 'bg-blue-100 text-blue-800'
      case 'event':
        return 'bg-purple-100 text-purple-800'
      case 'safety':
        return 'bg-red-100 text-red-800'
      case 'billing':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="p-8">Loading announcements...</div>
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Announcements</h1>
        <Button>Create Announcement</Button>
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No announcements yet. Create your first announcement to communicate with your members.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{announcement.title}</CardTitle>
                    <p className="text-sm text-gray-500">
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getCategoryColor(announcement.category)}>
                      {announcement.category}
                    </Badge>
                    <Badge className={getPriorityColor(announcement.priority)}>
                      {announcement.priority}
                    </Badge>
                    <Badge variant={announcement.is_published ? 'default' : 'secondary'}>
                      {announcement.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 line-clamp-2">{announcement.content}</p>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm">Edit</Button>
                  {!announcement.is_published && (
                    <Button size="sm">Publish</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
