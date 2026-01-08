import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyAdminClient = adminClient as any

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    // Support both single student (student_profile_id) and multiple students (student_profile_ids)
    const { event_id, student_profile_id, student_profile_ids, family_id } = body

    // Determine which student(s) to register
    let profileIds: string[] = []
    if (student_profile_ids && Array.isArray(student_profile_ids)) {
      profileIds = student_profile_ids
    } else if (student_profile_id) {
      profileIds = [student_profile_id]
    }

    if (!event_id || profileIds.length === 0) {
      return NextResponse.json({ error: 'Event ID and student profile ID(s) are required' }, { status: 400 })
    }

    // Get user's profile to verify school
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single()

    if (!profile?.school_id) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 })
    }

    // Get event details
    const { data: event } = await anyAdminClient
      .from('events')
      .select('*, registrations:event_registrations(count)')
      .eq('id', event_id)
      .eq('school_id', profile.school_id)
      .eq('is_published', true)
      .single()

    const eventData = event as {
      id: string
      school_id: string
      max_capacity: number | null
      registration_deadline: string | null
      fee: number | null
      is_published: boolean
      registrations: { count: number }[]
    } | null

    if (!eventData) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if event is free (this endpoint is for free events only)
    if (eventData.fee && eventData.fee > 0) {
      return NextResponse.json(
        { error: 'This is a paid event. Please use the payment endpoint.' },
        { status: 400 }
      )
    }

    // Check registration deadline
    if (eventData.registration_deadline) {
      const deadline = new Date(eventData.registration_deadline)
      if (new Date() > deadline) {
        return NextResponse.json({ error: 'Registration deadline has passed' }, { status: 400 })
      }
    }

    // Check max capacity
    const currentCount = eventData.registrations?.[0]?.count || 0
    if (eventData.max_capacity && currentCount + profileIds.length > eventData.max_capacity) {
      return NextResponse.json({
        error: `Only ${eventData.max_capacity - currentCount} spots remaining`
      }, { status: 400 })
    }

    // Check for existing registrations
    const { data: existingRegs } = await anyAdminClient
      .from('event_registrations')
      .select('student_profile_id')
      .eq('event_id', event_id)
      .in('student_profile_id', profileIds)

    const existingIds = (existingRegs || []).map((r: { student_profile_id: string }) => r.student_profile_id)
    const newProfileIds = profileIds.filter((id: string) => !existingIds.includes(id))

    if (newProfileIds.length === 0) {
      return NextResponse.json({ error: 'Already registered for this event' }, { status: 400 })
    }

    // Get family_id for each student if not provided
    let finalFamilyId = family_id
    if (!finalFamilyId && newProfileIds.length === 1) {
      // Try to get family_id from the student's profile
      const { data: studentProfile } = await anyAdminClient
        .from('student_profiles')
        .select('profile_id')
        .eq('id', newProfileIds[0])
        .single()

      if (studentProfile) {
        const { data: userProfile } = await anyAdminClient
          .from('profiles')
          .select('family_id')
          .eq('id', studentProfile.profile_id)
          .single()

        if (userProfile?.family_id) {
          finalFamilyId = userProfile.family_id
        }
      }
    }

    // Create registrations
    const registrations = newProfileIds.map((student_profile_id: string) => ({
      event_id,
      student_profile_id,
      family_id: finalFamilyId || null,
      payment_status: 'paid', // Free events are marked as paid
    }))

    const { data: created, error } = await anyAdminClient
      .from('event_registrations')
      .insert(registrations)
      .select()

    if (error) {
      console.error('Create registration error:', error)
      return NextResponse.json({ error: 'Failed to register' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      registered: created.length,
      already_registered: existingIds.length,
      registration: created[0],
    }, { status: 201 })
  } catch (error) {
    console.error('Registration API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const registrationId = searchParams.get('registration_id')

    if (!registrationId) {
      return NextResponse.json({ error: 'Missing registration ID' }, { status: 400 })
    }

    const { error } = await (adminClient as any)
      .from('event_registrations')
      .delete()
      .eq('id', registrationId)

    if (error) {
      console.error('Delete registration error:', error)
      return NextResponse.json({ error: 'Failed to cancel registration' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Registration API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
