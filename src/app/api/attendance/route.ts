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
      .select('*, student_profile:student_profiles(*, profile:profiles(full_name, avatar_url)), class_session:class_sessions(*, class_schedule:class_schedules(name, school_id))')
      .order('check_in_time', { ascending: false })

    if (sessionId) query = query.eq('class_session_id', sessionId)
    if (startDate) query = query.gte('check_in_time', startDate)
    if (endDate) query = query.lte('check_in_time', endDate)

    const { data: attendance, error } = await query.limit(100)

    // Filter by school_id if provided (through the class_schedule relation)
    let filteredAttendance = attendance
    if (schoolId && attendance) {
      filteredAttendance = attendance.filter((record: any) =>
        record.class_session?.class_schedule?.school_id === schoolId
      )
    }

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 })
    }

    return NextResponse.json(filteredAttendance || [])
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
    const { school_id, class_session_id, student_id, check_in_method } = body

    if (!student_id) {
      return NextResponse.json({ error: 'Missing student ID' }, { status: 400 })
    }

    // For attendance, we need a class_session_id (required by schema)
    // If no session provided, we need to create or find a general session for today
    let sessionId = class_session_id

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyAdminClient = adminClient as any

    if (!sessionId && school_id) {
      // Try to find or create a "General Attendance" class schedule for this school
      let { data: generalClass } = await anyAdminClient
        .from('class_schedules')
        .select('id')
        .eq('school_id', school_id)
        .eq('name', 'General Attendance')
        .single() as { data: { id: string } | null }

      if (!generalClass) {
        // Create a general attendance class
        const today = new Date().getDay()
        const { data: newClass } = await anyAdminClient
          .from('class_schedules')
          .insert({
            school_id,
            name: 'General Attendance',
            description: 'General check-in for students',
            day_of_week: today,
            start_time: '00:00',
            end_time: '23:59',
            is_active: true,
          })
          .select()
          .single() as { data: { id: string } | null }
        generalClass = newClass
      }

      if (generalClass) {
        // Find or create today's session
        const today = new Date().toISOString().split('T')[0]
        let { data: todaySession } = await anyAdminClient
          .from('class_sessions')
          .select('id')
          .eq('class_schedule_id', generalClass.id)
          .eq('date', today)
          .single() as { data: { id: string } | null }

        if (!todaySession) {
          const { data: newSession } = await anyAdminClient
            .from('class_sessions')
            .insert({
              class_schedule_id: generalClass.id,
              date: today,
              status: 'scheduled',
            })
            .select()
            .single() as { data: { id: string } | null }
          todaySession = newSession
        }

        sessionId = todaySession?.id
      }
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Please select a class session' }, { status: 400 })
    }

    // Get or create student_profile for this profile
    // First check if there's a student_profile for this profile ID
    let { data: studentProfile } = await anyAdminClient
      .from('student_profiles')
      .select('id')
      .eq('profile_id', student_id)
      .single() as { data: { id: string } | null }

    if (!studentProfile && school_id) {
      // Create a student_profile record
      const { data: newStudentProfile } = await anyAdminClient
        .from('student_profiles')
        .insert({
          school_id,
          profile_id: student_id,
          is_active: true,
        })
        .select()
        .single() as { data: { id: string } | null }
      studentProfile = newStudentProfile
    }

    if (!studentProfile) {
      return NextResponse.json({ error: 'Could not find or create student profile' }, { status: 400 })
    }

    // Check if already checked in for this session
    const { data: existing } = await anyAdminClient
      .from('attendance_records')
      .select('id')
      .eq('class_session_id', sessionId)
      .eq('student_profile_id', studentProfile.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Student already checked in for this session' }, { status: 400 })
    }

    const { data: record, error } = await anyAdminClient
      .from('attendance_records')
      .insert({
        class_session_id: sessionId,
        student_profile_id: studentProfile.id,
        check_in_time: new Date().toISOString(),
        check_in_method: check_in_method || 'manual',
        checked_in_by: user.id,
      })
      .select('*, student_profile:student_profiles(id, profile:profiles(full_name))')
      .single()

    if (error) {
      console.error('Create attendance error:', error)
      return NextResponse.json({ error: 'Failed to record attendance' }, { status: 500 })
    }

    // Transform response to match expected format
    const response = {
      ...record,
      student: record.student_profile,
      class_session: { class_schedule: { name: 'Check-in' } }
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Attendance API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
