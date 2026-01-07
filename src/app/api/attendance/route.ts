import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const sessionId = searchParams.get('session_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('attendance_records')
      .select('*, student:student_profiles(*, profile:profiles(full_name, avatar_url)), class_session:class_sessions(*, class_schedule:class_schedules(name))')
      .order('check_in_time', { ascending: false })

    if (schoolId) query = query.eq('school_id', schoolId)
    if (sessionId) query = query.eq('class_session_id', sessionId)
    if (startDate) query = query.gte('check_in_time', startDate)
    if (endDate) query = query.lte('check_in_time', endDate)

    const { data: attendance, error } = await query.limit(100)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 })
    }

    return NextResponse.json(attendance)
  } catch (error) {
    console.error('Get attendance error:', error)
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

    const body = await request.json()
    const { school_id, class_session_id, student_id, check_in_method, notes } = body

    if (!school_id || !student_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if already checked in for this session
    if (class_session_id) {
      const { data: existing } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('class_session_id', class_session_id)
        .eq('student_id', student_id)
        .single()

      if (existing) {
        return NextResponse.json({ error: 'Student already checked in for this session' }, { status: 400 })
      }
    }

    const { data: record, error } = await (adminClient as any)
      .from('attendance_records')
      .insert({
        school_id,
        class_session_id,
        student_id,
        check_in_time: new Date().toISOString(),
        check_in_method: check_in_method || 'manual',
        checked_in_by: user.id,
        notes,
      })
      .select('*, student:student_profiles(*, profile:profiles(full_name))')
      .single()

    if (error) {
      console.error('Create attendance error:', error)
      return NextResponse.json({ error: 'Failed to record attendance' }, { status: 500 })
    }

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Attendance API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
