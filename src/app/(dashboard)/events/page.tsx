'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar } from '@/components/ui/calendar'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Calendar as CalendarIcon,
  MapPin,
  Users,
  Clock,
  DollarSign,
  CheckCircle,
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Event {
  id: string
  title: string
  description: string | null
  event_type: string
  start_date: string
  end_date: string | null
  location: string | null
  max_capacity: number | null
  fee: number | null
  registration_deadline: string | null
  is_published: boolean
  image_url: string | null
  registrations: { count: number }[]
}

interface Registration {
  id: string
  event_id: string
  payment_status: string
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  tournament: 'Tournament',
  seminar: 'Seminar',
  belt_test: 'Belt Test',
  workshop: 'Workshop',
  social: 'Social Event',
  other: 'Other',
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  tournament: 'bg-red-100 text-red-800',
  seminar: 'bg-blue-100 text-blue-800',
  belt_test: 'bg-yellow-100 text-yellow-800',
  workshop: 'bg-purple-100 text-purple-800',
  social: 'bg-green-100 text-green-800',
  other: 'bg-gray-100 text-gray-800',
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [myRegistrations, setMyRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [userProfile, setUserProfile] = useState<{ id: string; role: string; family_id: string | null } | null>(null)
  const [studentProfileId, setStudentProfileId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, family_id, school_id')
      .eq('id', user.id)
      .single()

    console.log('User profile:', profile, 'Error:', profileError)

    if (!profile) {
      console.error('No profile found for user')
      setLoading(false)
      return
    }

    if (!profile.school_id) {
      console.error('User has no school_id')
      setLoading(false)
      return
    }

    setUserProfile(profile)

    // Get student profile ID if exists
    const { data: studentProfile } = await supabase
      .from('student_profiles')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (studentProfile) {
      setStudentProfileId(studentProfile.id)
    }

    // Get published events for user's school (show all for calendar, not just future)
    console.log('Fetching events for school_id:', profile.school_id)

    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('school_id', profile.school_id)
      .eq('is_published', true)
      .order('start_date', { ascending: true })

    console.log('Events data:', eventsData, 'Events error:', eventsError)

    if (eventsData) {
      setEvents(eventsData)
    }

    // Get user's registrations
    if (studentProfile) {
      const { data: registrations } = await supabase
        .from('event_registrations')
        .select('id, event_id, payment_status')
        .eq('student_profile_id', studentProfile.id)

      if (registrations) {
        setMyRegistrations(registrations)
      }
    }

    setLoading(false)
  }

  const handleEventClick = (event: Event) => {
    const fullEvent = events.find(e => e.id === event.id)
    if (fullEvent) {
      setSelectedEvent(fullEvent)
      setShowModal(true)
    }
  }

  const isRegistered = (eventId: string) => {
    return myRegistrations.some(r => r.event_id === eventId)
  }

  const getRegistration = (eventId: string) => {
    return myRegistrations.find(r => r.event_id === eventId)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const isDeadlinePassed = (deadline: string | null) => {
    if (!deadline) return false
    return new Date(deadline) < new Date()
  }

  const isFull = (event: Event) => {
    if (!event.max_capacity) return false
    const registrationCount = event.registrations?.[0]?.count || 0
    return registrationCount >= event.max_capacity
  }

  const handleRegister = async () => {
    if (!selectedEvent || !userProfile) return

    // Check if event is free or paid
    if (selectedEvent.fee && selectedEvent.fee > 0) {
      // Paid event - redirect to payment
      handlePayment()
    } else {
      // Free event - register directly
      await registerForEvent()
    }
  }

  const registerForEvent = async () => {
    if (!selectedEvent || !userProfile || !studentProfileId) {
      toast.error('Unable to register. Please ensure you have a student profile.')
      return
    }

    setRegistering(true)
    try {
      const response = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: selectedEvent.id,
          student_profile_id: studentProfileId,
          family_id: userProfile.family_id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register')
      }

      toast.success('Successfully registered for event!')
      setShowModal(false)
      fetchData() // Refresh data
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to register')
    } finally {
      setRegistering(false)
    }
  }

  const handlePayment = async () => {
    if (!selectedEvent || !userProfile || !studentProfileId) {
      toast.error('Unable to process payment. Please ensure you have a student profile.')
      return
    }

    setRegistering(true)
    try {
      const response = await fetch('/api/events/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: selectedEvent.id,
          student_profile_id: studentProfileId,
          family_id: userProfile.family_id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment')
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process payment')
      setRegistering(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!userProfile?.school_id) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="font-semibold text-yellow-800">No School Associated</h2>
          <p className="text-yellow-700">Your account is not associated with a school. Please contact your school administrator.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Events</h1>
        <p className="text-gray-600">View upcoming events and register</p>
      </div>

      {/* Upcoming Events Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        {events.slice(0, 3).map(event => {
          const registered = isRegistered(event.id)
          return (
            <Card
              key={event.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleEventClick(event)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <Badge className={EVENT_TYPE_COLORS[event.event_type]}>
                    {EVENT_TYPE_LABELS[event.event_type]}
                  </Badge>
                  {registered && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Registered
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold mb-1">{event.title}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {formatDate(event.start_date)}
                </p>
                {event.fee && event.fee > 0 ? (
                  <p className="text-sm font-medium text-green-600 mt-2">
                    {formatPrice(event.fee)}
                  </p>
                ) : (
                  <p className="text-sm font-medium text-green-600 mt-2">Free</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Calendar View */}
      <Calendar
        events={events}
        onEventClick={handleEventClick}
      />

      {/* Event Details Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedEvent?.title}
        size="lg"
      >
        {selectedEvent && (
          <div className="space-y-4">
            {/* Event Type Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={EVENT_TYPE_COLORS[selectedEvent.event_type]}>
                {EVENT_TYPE_LABELS[selectedEvent.event_type]}
              </Badge>
              {isRegistered(selectedEvent.id) && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Registered
                </Badge>
              )}
              {selectedEvent.fee && selectedEvent.fee > 0 ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <DollarSign className="h-3 w-3 mr-1" />
                  {formatPrice(selectedEvent.fee)}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Free Event
                </Badge>
              )}
            </div>

            {/* Description */}
            {selectedEvent.description && (
              <p className="text-gray-700">{selectedEvent.description}</p>
            )}

            {/* Event Details */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm">
                <CalendarIcon className="h-4 w-4 text-gray-400" />
                <span>{formatDate(selectedEvent.start_date)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>
                  {formatTime(selectedEvent.start_date)}
                  {selectedEvent.end_date && ` - ${formatTime(selectedEvent.end_date)}`}
                </span>
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.max_capacity && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>
                    {selectedEvent.registrations?.[0]?.count || 0} / {selectedEvent.max_capacity} spots filled
                  </span>
                </div>
              )}
            </div>

            {/* Registration Deadline */}
            {selectedEvent.registration_deadline && (
              <div className={`text-sm p-3 rounded-lg ${
                isDeadlinePassed(selectedEvent.registration_deadline)
                  ? 'bg-red-50 text-red-700'
                  : 'bg-yellow-50 text-yellow-700'
              }`}>
                Registration deadline: {formatDate(selectedEvent.registration_deadline)}
                {isDeadlinePassed(selectedEvent.registration_deadline) && ' (Passed)'}
              </div>
            )}

            {/* Capacity Warning */}
            {isFull(selectedEvent) && (
              <div className="text-sm p-3 rounded-lg bg-red-50 text-red-700">
                This event is at full capacity.
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Close
              </Button>
              {!isRegistered(selectedEvent.id) ? (
                <Button
                  onClick={handleRegister}
                  disabled={
                    registering ||
                    isFull(selectedEvent) ||
                    isDeadlinePassed(selectedEvent.registration_deadline) ||
                    !studentProfileId
                  }
                  isLoading={registering}
                >
                  {selectedEvent.fee && selectedEvent.fee > 0
                    ? `Pay & Register (${formatPrice(selectedEvent.fee)})`
                    : 'Register for Free'
                  }
                </Button>
              ) : (
                <Button disabled variant="outline" className="text-green-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Already Registered
                </Button>
              )}
            </div>

            {!studentProfileId && (
              <p className="text-sm text-amber-600">
                You need a student profile to register for events. Please contact your school administrator.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
