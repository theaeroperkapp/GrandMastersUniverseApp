import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { AttendanceClient } from '@/components/owner/attendance-client'

// Disable caching to always fetch fresh data
export const dynamic = 'force-dynamic'

interface ProfileData {
  role: string
  school_id: string | null
}

interface ClassSchedule {
  id: string
  name: string
  day_of_week: number
  start_time: string
  end_time: string
}

export default async function AttendancePage() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

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

  // Get today's date and day of week
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const todayDayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.

  // Get active class schedules for this school (use admin client for RLS bypass)
  const { data: classes } = await adminClient
    .from('class_schedules')
    .select('*')
    .eq('school_id', profileData.school_id)
    .eq('is_active', true)
    .order('start_time')

  // Filter classes that are scheduled for today's day of week
  const todaysClasses: ClassSchedule[] = ((classes || []) as ClassSchedule[]).filter(
    (c) => c.day_of_week === todayDayOfWeek
  )

  // Get class schedule IDs for this school
  const classIds = classes?.map((c: ClassSchedule) => c.id) || []

  // Auto-create sessions for today's classes if they don't exist
  for (const cls of todaysClasses) {
    const { data: existingSession } = await adminClient
      .from('class_sessions')
      .select('id')
      .eq('class_schedule_id', cls.id)
      .eq('date', today)
      .single()

    if (!existingSession) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from('class_sessions')
        .insert({
          class_schedule_id: cls.id,
          date: today,
          status: 'scheduled',
        })
    }
  }

  // Get today's class sessions (join through class_schedules)
  const { data: sessions } = classIds.length > 0 ? await adminClient
    .from('class_sessions')
    .select('*, class_schedule:class_schedules(id, name, school_id)')
    .in('class_schedule_id', classIds)
    .eq('date', today) : { data: [] }

  // Get students for this school (approved members who are students)
  const { data: students } = await adminClient
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('school_id', profileData.school_id)
    .eq('is_approved', true)
    .in('role', ['student', 'parent'])

  // Get recent attendance records
  const { data: recentAttendance } = await adminClient
    .from('attendance_records')
    .select(`
      *,
      student_profile:student_profiles(id, profile:profiles(full_name)),
      class_session:class_sessions(id, date, class_schedule:class_schedules(name, school_id))
    `)
    .order('check_in_time', { ascending: false })
    .limit(50)

  // Filter attendance records by school
  const schoolAttendance = (recentAttendance || []).filter(
    (record: any) => record.class_session?.class_schedule?.school_id === profileData.school_id
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-gray-600">Track student attendance for classes</p>
      </div>

      <AttendanceClient
        classes={classes || []}
        sessions={sessions || []}
        students={students || []}
        recentAttendance={schoolAttendance}
        schoolId={profileData.school_id}
      />
    </div>
  )
}
