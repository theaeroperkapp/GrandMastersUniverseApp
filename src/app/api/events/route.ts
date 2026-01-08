import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateEventInput, sanitizeString, formatValidationErrors } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('events')
      .select('*, registrations:event_registrations(count)')
      .order('event_date', { ascending: true })

    if (schoolId) {
      query = query.eq('school_id', schoolId)
    }

    const { data: events, error } = await query

    if (error) {
      console.error('Get events error:', error)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    return NextResponse.json(events)
  } catch (error) {
    console.error('Events API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: string; school_id: string | null } | null

    if (!profileData || (profileData.role !== 'owner' && profileData.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const {
      school_id,
      title,
      description,
      event_type,
      event_date,
      start_time,
      end_time,
      location,
      registration_fee,
      max_participants,
      registration_deadline,
      is_public,
    } = body

    // Sanitize inputs
    const sanitizedInput = {
      school_id: sanitizeString(school_id),
      title: sanitizeString(title),
      description: description ? sanitizeString(description) : null,
      event_type: sanitizeString(event_type),
      event_date: sanitizeString(event_date),
      start_time: start_time ? sanitizeString(start_time) : null,
      end_time: end_time ? sanitizeString(end_time) : null,
      location: location ? sanitizeString(location) : null,
      registration_fee: registration_fee !== undefined ? Number(registration_fee) : null,
      max_participants: max_participants !== undefined ? Number(max_participants) : null,
      registration_deadline: registration_deadline ? sanitizeString(registration_deadline) : null,
      is_public: is_public ?? true,
    }

    // Validate inputs
    const validation = validateEventInput(sanitizedInput)
    if (!validation.isValid) {
      return NextResponse.json({ error: formatValidationErrors(validation.errors) }, { status: 400 })
    }

    const { data: event, error } = await (adminClient as any)
      .from('events')
      .insert({
        school_id: sanitizedInput.school_id,
        title: sanitizedInput.title,
        description: sanitizedInput.description,
        event_type: sanitizedInput.event_type,
        event_date: sanitizedInput.event_date,
        start_time: sanitizedInput.start_time,
        end_time: sanitizedInput.end_time,
        location: sanitizedInput.location,
        registration_fee: sanitizedInput.registration_fee,
        max_participants: sanitizedInput.max_participants,
        registration_deadline: sanitizedInput.registration_deadline,
        is_public: sanitizedInput.is_public,
        status: 'upcoming',
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Create event error:', error)
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
    }

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Events API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
