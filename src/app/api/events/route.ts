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
      .order('start_date', { ascending: true })

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
      start_date,
      end_date,
      location,
      fee,
      max_capacity,
      registration_deadline,
      is_published,
    } = body

    // Sanitize inputs
    const sanitizedInput = {
      school_id: sanitizeString(school_id),
      title: sanitizeString(title),
      description: description ? sanitizeString(description) : null,
      event_type: sanitizeString(event_type),
      start_date: sanitizeString(start_date),
      end_date: end_date ? sanitizeString(end_date) : null,
      location: location ? sanitizeString(location) : null,
      fee: fee !== undefined ? Number(fee) : null,
      max_capacity: max_capacity !== undefined ? Number(max_capacity) : null,
      registration_deadline: registration_deadline ? sanitizeString(registration_deadline) : null,
      is_published: is_published ?? false,
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
        start_date: sanitizedInput.start_date,
        end_date: sanitizedInput.end_date,
        location: sanitizedInput.location,
        fee: sanitizedInput.fee,
        max_capacity: sanitizedInput.max_capacity,
        registration_deadline: sanitizedInput.registration_deadline,
        is_published: sanitizedInput.is_published,
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
