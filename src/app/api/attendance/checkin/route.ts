import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const body = await request.json()
    const { school_id, method, code, student_id, class_session_id } = body

    if (!school_id || !method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let studentToCheckIn = student_id

    // Handle PIN check-in
    if (method === 'pin' && code) {
      const { data: student } = await supabase
        .from('student_profiles')
        .select('id, profile:profiles(full_name)')
        .eq('school_id', school_id)
        .eq('check_in_pin', code)
        .single()

      const studentData = student as { id: string } | null
      if (!studentData) {
        return NextResponse.json({ error: 'Invalid PIN code' }, { status: 400 })
      }

      studentToCheckIn = studentData.id
    }

    // Handle QR code check-in
    if (method === 'qr' && code) {
      // QR code contains the student ID
      const { data: student } = await supabase
        .from('student_profiles')
        .select('id, profile:profiles(full_name)')
        .eq('id', code)
        .eq('school_id', school_id)
        .single()

      const studentData = student as { id: string } | null
      if (!studentData) {
        return NextResponse.json({ error: 'Invalid QR code' }, { status: 400 })
      }

      studentToCheckIn = studentData.id
    }

    if (!studentToCheckIn) {
      return NextResponse.json({ error: 'Student not found' }, { status: 400 })
    }

    // Check if already checked in today for this session
    if (class_session_id) {
      const { data: existing } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('class_session_id', class_session_id)
        .eq('student_id', studentToCheckIn)
        .single()

      if (existing) {
        return NextResponse.json({ error: 'Already checked in for this session' }, { status: 400 })
      }
    }

    // Create attendance record
    const { data: record, error } = await (adminClient as any)
      .from('attendance_records')
      .insert({
        school_id,
        class_session_id,
        student_id: studentToCheckIn,
        check_in_time: new Date().toISOString(),
        check_in_method: method,
      })
      .select('*, student:student_profiles(*, profile:profiles(full_name, avatar_url))')
      .single()

    if (error) {
      console.error('Check-in error:', error)
      return NextResponse.json({ error: 'Failed to check in' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Check-in successful',
      record,
    })
  } catch (error) {
    console.error('Check-in API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
