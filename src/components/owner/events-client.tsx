'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Clock,
  Trophy,
  UserPlus,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Event {
  id: string
  school_id: string
  title: string
  description: string | null
  event_type: string
  start_date: string
  end_date: string | null
  location: string | null
  fee: number | null
  max_capacity: number | null
  registration_deadline: string | null
  is_published: boolean
  created_at: string
  registrations?: { count: number }[]
}

interface Student {
  id: string
  profile: {
    id: string
    full_name: string
    avatar_url: string | null
  }
}

interface EventsClientProps {
  initialEvents: Event[]
  students: Student[]
  schoolId: string
}

const EVENT_TYPES = [
  { value: 'tournament', label: 'Tournament' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'belt_test', label: 'Belt Test' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'social', label: 'Social Event' },
  { value: 'other', label: 'Other' },
]

export function EventsClient({ initialEvents, students, schoolId }: EventsClientProps) {
  const [events, setEvents] = useState(initialEvents)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const router = useRouter()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'tournament',
    start_date: '',
    end_date: '',
    location: '',
    fee: '',
    max_capacity: '',
    registration_deadline: '',
    is_published: true,
  })

  const openCreateModal = () => {
    setEditingEvent(null)
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    nextWeek.setHours(9, 0, 0, 0)
    const endDate = new Date(nextWeek)
    endDate.setHours(17, 0, 0, 0)
    setFormData({
      title: '',
      description: '',
      event_type: 'tournament',
      start_date: nextWeek.toISOString().slice(0, 16),
      end_date: endDate.toISOString().slice(0, 16),
      location: '',
      fee: '',
      max_capacity: '',
      registration_deadline: '',
      is_published: true,
    })
    setIsModalOpen(true)
  }

  const openEditModal = (event: Event) => {
    setEditingEvent(event)
    setFormData({
      title: event.title,
      description: event.description || '',
      event_type: event.event_type,
      start_date: event.start_date?.slice(0, 16) || '',
      end_date: event.end_date?.slice(0, 16) || '',
      location: event.location || '',
      fee: event.fee?.toString() || '',
      max_capacity: event.max_capacity?.toString() || '',
      registration_deadline: event.registration_deadline?.slice(0, 16) || '',
      is_published: event.is_published,
    })
    setIsModalOpen(true)
  }

  const openRegisterModal = (event: Event) => {
    setSelectedEvent(event)
    setSelectedStudents([])
    setIsRegisterModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const payload = {
        school_id: schoolId,
        title: formData.title,
        description: formData.description || null,
        event_type: formData.event_type,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        location: formData.location || null,
        fee: formData.fee ? parseInt(formData.fee) * 100 : null, // Convert to cents
        max_capacity: formData.max_capacity ? parseInt(formData.max_capacity) : null,
        registration_deadline: formData.registration_deadline || null,
        is_published: formData.is_published,
      }

      const url = editingEvent ? `/api/events/${editingEvent.id}` : '/api/events'
      const response = await fetch(url, {
        method: editingEvent ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save event')
      }

      const savedEvent = await response.json()

      if (editingEvent) {
        setEvents(events.map(e => e.id === savedEvent.id ? savedEvent : e))
        toast.success('Event updated successfully')
      } else {
        setEvents([...events, savedEvent])
        toast.success('Event created successfully')
      }

      setIsModalOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      const response = await fetch(`/api/events/${eventId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete event')

      setEvents(events.filter(e => e.id !== eventId))
      toast.success('Event deleted successfully')
      router.refresh()
    } catch {
      toast.error('Failed to delete event')
    }
  }

  const handleRegister = async () => {
    if (!selectedEvent || selectedStudents.length === 0) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: selectedEvent.id,
          student_ids: selectedStudents,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to register')
      }

      toast.success(`${selectedStudents.length} student(s) registered successfully`)
      setIsRegisterModalOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'tournament':
        return <Trophy className="h-5 w-5" />
      case 'belt_test':
        return <Users className="h-5 w-5" />
      default:
        return <Calendar className="h-5 w-5" />
    }
  }

  const getStatusBadge = (event: Event) => {
    const eventDate = new Date(event.start_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (eventDate < today) {
      return <Badge variant="secondary">Past</Badge>
    } else if (eventDate.toDateString() === today.toDateString()) {
      return <Badge className="bg-green-500">Today</Badge>
    } else {
      return <Badge variant="outline">Upcoming</Badge>
    }
  }

  const upcomingEvents = events.filter(e => new Date(e.start_date) >= new Date())
  const pastEvents = events.filter(e => new Date(e.start_date) < new Date())

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">No upcoming events</p>
              <Button onClick={openCreateModal}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Event
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingEvents.map(event => (
                <div key={event.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        {getEventTypeIcon(event.event_type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{event.title}</h3>
                          {getStatusBadge(event)}
                          <Badge variant="outline">
                            {EVENT_TYPES.find(t => t.value === event.event_type)?.label}
                          </Badge>
                        </div>
                        {event.description && (
                          <p className="text-sm text-gray-500 mb-2">{event.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(event.start_date)}
                          </span>
                          {event.end_date && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Until {formatDate(event.end_date)}
                            </span>
                          )}
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {event.location}
                            </span>
                          )}
                          {event.fee && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              ${(event.fee / 100).toFixed(2)}
                            </span>
                          )}
                          {event.max_capacity && (
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {event.registrations?.[0]?.count || 0}/{event.max_capacity}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => openRegisterModal(event)}>
                        <UserPlus className="h-4 w-4 mr-1" />
                        Register
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(event)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(event.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-500">
              <Clock className="h-5 w-5" />
              Past Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pastEvents.slice(0, 5).map(event => (
                <div key={event.id} className="p-3 border rounded-lg bg-gray-50 opacity-75">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getEventTypeIcon(event.event_type)}
                      <span className="font-medium">{event.title}</span>
                      <Badge variant="secondary">
                        {EVENT_TYPES.find(t => t.value === event.event_type)?.label}
                      </Badge>
                    </div>
                    <span className="text-sm text-gray-500">{formatDate(event.start_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEvent ? 'Edit Event' : 'Create Event'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Spring Tournament 2024"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Event details..."
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_type">Event Type *</Label>
              <select
                id="event_type"
                value={formData.event_type}
                onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              >
                {EVENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date & Time *</Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_date">End Date & Time</Label>
            <Input
              id="end_date"
              type="datetime-local"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Main Dojo or External Venue"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fee">Registration Fee ($)</Label>
              <Input
                id="fee"
                type="number"
                min="0"
                step="1"
                value={formData.fee}
                onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_capacity">Max Capacity</Label>
              <Input
                id="max_capacity"
                type="number"
                min="1"
                value={formData.max_capacity}
                onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
                placeholder="Unlimited"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="registration_deadline">Registration Deadline</Label>
            <Input
              id="registration_deadline"
              type="datetime-local"
              value={formData.registration_deadline}
              onChange={(e) => setFormData({ ...formData, registration_deadline: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_published"
              checked={formData.is_published}
              onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="is_published">Publish this event (make visible to students)</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              {editingEvent ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Register Students Modal */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title={`Register for ${selectedEvent?.title}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select students to register for this event.
            {selectedEvent?.fee && (
              <span className="font-medium"> Fee: ${(selectedEvent.fee / 100).toFixed(2)} per student</span>
            )}
          </p>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {students.map(student => (
              <label
                key={student.id}
                className="flex items-center gap-3 p-2 border rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedStudents([...selectedStudents, student.id])
                    } else {
                      setSelectedStudents(selectedStudents.filter(id => id !== student.id))
                    }
                  }}
                  className="rounded"
                />
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  {student.profile.avatar_url ? (
                    <img
                      src={student.profile.avatar_url}
                      alt={student.profile.full_name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-600">
                      {student.profile.full_name.charAt(0)}
                    </span>
                  )}
                </div>
                <span>{student.profile.full_name}</span>
              </label>
            ))}
          </div>

          {selectedStudents.length > 0 && selectedEvent?.fee && (
            <div className="p-3 bg-gray-100 rounded-lg">
              <p className="font-medium">
                Total: ${((selectedEvent.fee / 100) * selectedStudents.length).toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">
                {selectedStudents.length} student(s) x ${(selectedEvent.fee / 100).toFixed(2)}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsRegisterModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRegister}
              disabled={selectedStudents.length === 0}
              isLoading={isLoading}
            >
              Register {selectedStudents.length > 0 && `(${selectedStudents.length})`}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
