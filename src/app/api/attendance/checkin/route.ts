import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const body = await request.json()
    const { school_id, method, code, class_session_id } = body

    if (!school_id || !method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let studentProfileId: string | null = null
    let studentName: string = 'Student'

    type StudentWithProfile = { id: string; profile: { full_name: string } | null }

    // Handle PIN check-in
    if (method === 'pin' && code) {
      const { data: student } = await adminClient
        .from('student_profiles')
        .select('id, profile:profiles(full_name)')
        .eq('school_id', school_id)
        .eq('pin_code', code)
        .single()

      if (!student) {
        return NextResponse.json({ error: 'Invalid PIN code' }, { status: 400 })
      }

      const typedStudent = student as unknown as StudentWithProfile
      studentProfileId = typedStudent.id
      studentName = typedStudent.profile?.full_name || 'Student'
    }

    // Handle QR code check-in (QR contains student_profile ID or profile ID)
    if (method === 'qr' && code) {
      // First try to find by student_profile ID
      let { data: student } = await adminClient
        .from('student_profiles')
        .select('id, profile:profiles(full_name)')
        .eq('id', code)
        .eq('school_id', school_id)
        .single()

      // If not found, try by profile ID
      if (!student) {
        const { data: studentByProfile } = await adminClient
          .from('student_profiles')
          .select('id, profile:profiles(full_name)')
          .eq('profile_id', code)
          .eq('school_id', school_id)
          .single()
        student = studentByProfile
      }

      if (!student) {
        return NextResponse.json({ error: 'Invalid QR code' }, { status: 400 })
      }

      const typedStudent = student as unknown as StudentWithProfile
      studentProfileId = typedStudent.id
      studentName = typedStudent.profile?.full_name || 'Student'
    }

    if (!studentProfileId) {
      return NextResponse.json({ error: 'Student not found' }, { status: 400 })
    }

    // Get or create a class session for attendance
    let sessionId = class_session_id

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyAdminClient = adminClient as any

    if (!sessionId) {
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
      return NextResponse.json({ error: 'Could not create session for check-in' }, { status: 500 })
    }

    // Check if already checked in for this session
    const { data: existing } = await anyAdminClient
      .from('attendance_records')
      .select('id')
      .eq('class_session_id', sessionId)
      .eq('student_profile_id', studentProfileId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already checked in for this session' }, { status: 400 })
    }

    // Create attendance record
    const { data: record, error } = await anyAdminClient
      .from('attendance_records')
      .insert({
        class_session_id: sessionId,
        student_profile_id: studentProfileId,
        check_in_time: new Date().toISOString(),
        check_in_method: method,
      })
      .select('*, student_profile:student_profiles(id, profile:profiles(full_name, avatar_url))')
      .single()

    if (error) {
      console.error('Check-in error:', error)
      return NextResponse.json({ error: 'Failed to check in' }, { status: 500 })
    }

    // Transform response to match expected format
    const response = {
      ...record,
      student: record?.student_profile,
      class_session: { class_schedule: { name: 'Check-in' } }
    }

    return NextResponse.json({
      success: true,
      message: `${studentName} checked in successfully`,
      record: response,
    })
  } catch (error) {
    console.error('Check-in API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
