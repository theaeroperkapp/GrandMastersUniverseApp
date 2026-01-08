'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Edit, Trash2, Send, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

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

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'event', label: 'Event' },
  { value: 'safety', label: 'Safety' },
  { value: 'billing', label: 'Billing' },
]

const PRIORITIES = [
  { value: 'normal', label: 'Normal' },
  { value: 'important', label: 'Important' },
  { value: 'urgent', label: 'Urgent' },
]

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    priority: 'normal',
    is_published: true,
  })

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    const supabase = createClient()
    const { data: profile } = await supabase.auth.getUser()

    if (!profile.user) return

    setUserId(profile.user.id)

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

    setSchoolId(userProfile.school_id)

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

  const openCreateModal = () => {
    setEditingAnnouncement(null)
    setFormData({
      title: '',
      content: '',
      category: 'general',
      priority: 'normal',
      is_published: true,
    })
    setIsModalOpen(true)
  }

  const openEditModal = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setFormData({
      title: announcement.title,
      content: announcement.content,
      category: announcement.category,
      priority: announcement.priority,
      is_published: announcement.is_published,
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schoolId || !userId) return

    setIsSubmitting(true)
    const supabase = createClient()

    try {
      if (editingAnnouncement) {
        const { error } = await supabase
          .from('announcements')
          .update({
            title: formData.title,
            content: formData.content,
            category: formData.category,
            priority: formData.priority,
            is_published: formData.is_published,
          })
          .eq('id', editingAnnouncement.id)

        if (error) throw error
        toast.success('Announcement updated successfully')
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert({
            school_id: schoolId,
            author_id: userId,
            title: formData.title,
            content: formData.content,
            category: formData.category,
            priority: formData.priority,
            is_published: formData.is_published,
          })

        if (error) throw error
        toast.success('Announcement created successfully')
      }

      setIsModalOpen(false)
      fetchAnnouncements()
    } catch (error) {
      console.error('Error saving announcement:', error)
      toast.error('Failed to save announcement')
    } finally {
      setIsSubmitting(false)
    }
  }

  const togglePublish = async (announcement: Announcement) => {
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_published: !announcement.is_published })
        .eq('id', announcement.id)

      if (error) throw error

      toast.success(announcement.is_published ? 'Announcement unpublished' : 'Announcement published')
      fetchAnnouncements()
    } catch (error) {
      console.error('Error toggling publish:', error)
      toast.error('Failed to update announcement')
    }
  }

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Announcement deleted')
      fetchAnnouncements()
    } catch (error) {
      console.error('Error deleting announcement:', error)
      toast.error('Failed to delete announcement')
    }
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
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-gray-600">Communicate with your members</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Create Announcement
        </Button>
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
                <p className="text-gray-700 whitespace-pre-wrap">{announcement.content}</p>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => openEditModal(announcement)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => togglePublish(announcement)}
                  >
                    {announcement.is_published ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-1" />
                        Unpublish
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-1" />
                        Publish
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteAnnouncement(announcement.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Announcement title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Write your announcement..."
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[150px]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {PRIORITIES.map((pri) => (
                  <option key={pri.value} value={pri.value}>{pri.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_published"
              checked={formData.is_published}
              onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="is_published">Publish immediately</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingAnnouncement ? 'Update' : 'Create'} Announcement
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
