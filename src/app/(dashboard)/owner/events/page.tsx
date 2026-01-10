import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EventsClient } from '@/components/owner/events-client'

interface ProfileData {
  role: string
  school_id: string | null
}

export default async function EventsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, school_id')
    .eq('id', user.id)
    .single()

  const profileData = profile as ProfileData | null

  if (!profileData || (profileData.role !== 'owner' && profileData.role !== 'admin')) {
    redirect('/feed')
  }

  if (!profileData.school_id) {
    redirect('/feed')
  }

  // Get events for this school
  const { data: events } = await supabase
    .from('events')
    .select('*, registrations:event_registrations(count)')
    .eq('school_id', profileData.school_id)
    .order('start_date', { ascending: true })

  // Get students for registration
  const { data: students } = await supabase
    .from('student_profiles')
    .select('*, profile:profiles(id, full_name, avatar_url)')
    .eq('school_id', profileData.school_id)

  // Get all registrations for this school's events
  const eventIds = (events || []).map((e: { id: string }) => e.id)
  const { data: registrations } = eventIds.length > 0
    ? await supabase
        .from('event_registrations')
        .select('event_id, student_profile_id, payment_status')
        .in('event_id', eventIds)
    : { data: [] }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Events</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Manage school events, tournaments, and seminars</p>
      </div>

      <EventsClient
        initialEvents={events || []}
        students={students || []}
        schoolId={profileData.school_id}
        registrations={registrations || []}
      />
    </div>
  )
}
