'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Megaphone, Bell, Calendar, Shield, CreditCard, Info } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  content: string
  category: string
  priority: string
  created_at: string
  author?: {
    full_name: string
  }
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get user's school_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single()

    if (!profile?.school_id) {
      setLoading(false)
      return
    }

    // Fetch published announcements
    const { data } = await supabase
      .from('announcements')
      .select(`
        id,
        title,
        content,
        category,
        priority,
        created_at,
        author:profiles!announcements_author_id_fkey(full_name)
      `)
      .eq('school_id', profile.school_id)
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    if (data) {
      setAnnouncements(data as unknown as Announcement[])
    }
    setLoading(false)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'important':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'schedule':
        return <Calendar className="h-4 w-4" />
      case 'event':
        return <Bell className="h-4 w-4" />
      case 'safety':
        return <Shield className="h-4 w-4" />
      case 'billing':
        return <CreditCard className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return 'Today'
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return `${days} days ago`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  if (loading) {
    return <div className="p-8">Loading announcements...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Megaphone className="h-8 w-8 text-red-500" />
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-gray-600">Stay updated with the latest news from your school</p>
        </div>
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No announcements yet</p>
            <p className="text-sm">Check back later for updates from your school.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card
              key={announcement.id}
              className={`${announcement.priority === 'urgent' ? 'border-red-300 bg-red-50/50' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {announcement.priority === 'urgent' && (
                        <Badge className="bg-red-500 text-white">Urgent</Badge>
                      )}
                      {announcement.priority === 'important' && (
                        <Badge className="bg-yellow-500 text-white">Important</Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{announcement.title}</CardTitle>
                  </div>
                  <Badge className={getCategoryColor(announcement.category)}>
                    <span className="flex items-center gap-1">
                      {getCategoryIcon(announcement.category)}
                      {announcement.category}
                    </span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap mb-4">{announcement.content}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    Posted by {announcement.author?.full_name || 'School Admin'}
                  </span>
                  <span>{formatDate(announcement.created_at)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
