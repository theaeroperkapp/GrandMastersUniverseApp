import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AttendanceClient } from '@/components/owner/attendance-client'

interface ProfileData {
  role: string
  school_id: string | null
}

export default async function AttendancePage() {
  const supabase = await createClient()

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

  // Get today's date range
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Get active class schedules
  const { data: classes } = await supabase
    .from('class_schedules')
    .select('*')
    .eq('school_id', profileData.school_id)
    .eq('is_active', true)
    .order('start_time')

  // Get today's class sessions
  const { data: sessions } = await supabase
    .from('class_sessions')
    .select('*, class_schedule:class_schedules(name)')
    .eq('school_id', profileData.school_id)
    .gte('session_date', today.toISOString().split('T')[0])
    .lte('session_date', today.toISOString().split('T')[0])

  // Get students for this school
  const { data: students } = await supabase
    .from('student_profiles')
    .select('*, profile:profiles(id, full_name, avatar_url)')
    .eq('school_id', profileData.school_id)
    .eq('is_active', true)

  // Get recent attendance records
  const { data: recentAttendance } = await supabase
    .from('attendance_records')
    .select('*, student:student_profiles(*, profile:profiles(full_name)), class_session:class_sessions(*, class_schedule:class_schedules(name))')
    .eq('school_id', profileData.school_id)
    .order('check_in_time', { ascending: false })
    .limit(50)

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
        recentAttendance={recentAttendance || []}
        schoolId={profileData.school_id}
      />
    </div>
  )
}
