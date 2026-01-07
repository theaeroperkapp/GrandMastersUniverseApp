import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { event_id, student_ids } = body

    if (!event_id || !student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get event details
    const { data: event } = await supabase
      .from('events')
      .select('*, registrations:event_registrations(count)')
      .eq('id', event_id)
      .single()

    const eventData = event as {
      id: string
      max_participants: number | null
      registration_deadline: string | null
      registration_fee: number | null
      registrations: { count: number }[]
    } | null

    if (!eventData) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check registration deadline
    if (eventData.registration_deadline) {
      const deadline = new Date(eventData.registration_deadline)
      if (new Date() > deadline) {
        return NextResponse.json({ error: 'Registration deadline has passed' }, { status: 400 })
      }
    }

    // Check max participants
    const currentCount = eventData.registrations?.[0]?.count || 0
    if (eventData.max_participants && currentCount + student_ids.length > eventData.max_participants) {
      return NextResponse.json({
        error: `Only ${eventData.max_participants - currentCount} spots remaining`
      }, { status: 400 })
    }

    // Check for existing registrations
    const { data: existingRegs } = await supabase
      .from('event_registrations')
      .select('student_id')
      .eq('event_id', event_id)
      .in('student_id', student_ids)

    const existingStudentIds = (existingRegs || []).map((r: { student_id: string }) => r.student_id)
    const newStudentIds = student_ids.filter((id: string) => !existingStudentIds.includes(id))

    if (newStudentIds.length === 0) {
      return NextResponse.json({ error: 'All selected students are already registered' }, { status: 400 })
    }

    // Create registrations
    const registrations = newStudentIds.map((student_id: string) => ({
      event_id,
      student_id,
      registered_by: user.id,
      registration_fee_paid: eventData.registration_fee || 0,
      payment_status: eventData.registration_fee ? 'pending' : 'not_required',
    }))

    const { data: created, error } = await (adminClient as any)
      .from('event_registrations')
      .insert(registrations)
      .select()

    if (error) {
      console.error('Create registration error:', error)
      return NextResponse.json({ error: 'Failed to register students' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      registered: created.length,
      already_registered: existingStudentIds.length,
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
