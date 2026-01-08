import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's student profile with current belt
    const { data: studentProfileData } = await supabase
      .from('student_profiles')
      .select(`
        id,
        school_id,
        enrollment_date,
        belt_rank_id,
        belt_rank:belt_ranks(
          id,
          name,
          color,
          display_order
        )
      `)
      .eq('profile_id', user.id)
      .single()

    const studentProfile = studentProfileData as {
      id: string
      school_id: string
      enrollment_date: string | null
      belt_rank_id: string | null
      belt_rank: {
        id: string
        name: string
        color: string
        display_order: number
      } | null
    } | null

    if (!studentProfile) {
      return NextResponse.json({
        studentProfile: null,
        rankHistory: [],
        attendanceStats: null,
        recentAttendance: []
      })
    }

    // Get rank history (belt promotions)
    const { data: rankHistoryData } = await supabase
      .from('rank_history')
      .select(`
        id,
        promoted_at,
        notes,
        belt:belt_ranks(
          id,
          name,
          color,
          display_order
        ),
        promoted_by_profile:profiles!rank_history_promoted_by_fkey(
          id,
          full_name
        )
      `)
      .eq('student_profile_id', studentProfile.id)
      .order('promoted_at', { ascending: false })

    const rankHistory = (rankHistoryData || []) as Array<{
      id: string
      promoted_at: string
      notes: string | null
      belt: {
        id: string
        name: string
        color: string
        display_order: number
      } | null
      promoted_by_profile: {
        id: string
        full_name: string
      } | null
    }>

    // Get attendance records for stats
    const { data: allAttendanceData } = await supabase
      .from('attendance_records')
      .select('id, check_in_time')
      .eq('student_profile_id', studentProfile.id)

    const totalAttendance = allAttendanceData?.length || 0

    // Get attendance records from last 30 days for recent stats
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: recentAttendanceCountData } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('student_profile_id', studentProfile.id)
      .gte('check_in_time', thirtyDaysAgo.toISOString())

    const recentAttendanceCount = recentAttendanceCountData?.length || 0

    // Get recent attendance records with class info
    const { data: recentAttendanceData } = await supabase
      .from('attendance_records')
      .select(`
        id,
        check_in_time,
        check_in_method,
        class_session:class_sessions(
          id,
          date,
          class_schedule:class_schedules(
            id,
            name
          )
        )
      `)
      .eq('student_profile_id', studentProfile.id)
      .order('check_in_time', { ascending: false })
      .limit(10)

    const recentAttendance = (recentAttendanceData || []) as Array<{
      id: string
      check_in_time: string
      check_in_method: 'qr' | 'pin' | 'manual'
      class_session: {
        id: string
        date: string
        class_schedule: {
          id: string
          name: string
        } | null
      } | null
    }>

    // Calculate days since enrollment
    let daysSinceEnrollment = 0
    if (studentProfile.enrollment_date) {
      const enrollmentDate = new Date(studentProfile.enrollment_date)
      const today = new Date()
      daysSinceEnrollment = Math.floor((today.getTime() - enrollmentDate.getTime()) / (1000 * 60 * 60 * 24))
    }

    // Get all belts for the school to show progression
    const { data: allBeltsData } = await supabase
      .from('belt_ranks')
      .select('id, name, color, display_order, is_default, stripe_count, stripe_color')
      .eq('school_id', studentProfile.school_id)
      .order('display_order')

    const allBelts = (allBeltsData || []) as Array<{
      id: string
      name: string
      color: string
      display_order: number
      is_default: boolean
      stripe_count: number
      stripe_color: string
    }>

    return NextResponse.json({
      studentProfile: {
        id: studentProfile.id,
        schoolId: studentProfile.school_id,
        enrollmentDate: studentProfile.enrollment_date,
        currentBelt: studentProfile.belt_rank,
        daysSinceEnrollment,
      },
      rankHistory,
      attendanceStats: {
        totalClasses: totalAttendance,
        classesLast30Days: recentAttendanceCount,
      },
      recentAttendance,
      allBelts,
    })
  } catch (error) {
    console.error('My progress error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
