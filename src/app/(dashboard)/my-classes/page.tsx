'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen,
  Clock,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Award,
} from 'lucide-react'

interface Instructor {
  id: string
  full_name: string
}

interface BeltRank {
  id: string
  name: string
  color: string
  display_order: number
}

interface ClassSchedule {
  id: string
  name: string
  description: string | null
  day_of_week: number
  start_time: string
  end_time: string
  max_capacity: number | null
  belt_requirement_id: string | null
  instructor: Instructor | null
  belt_requirement: BeltRank | null
}

interface ClassSession {
  id: string
  date: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  notes: string | null
  class_schedule: {
    id: string
    name: string
    start_time: string
    end_time: string
  }
}

interface AttendanceRecord {
  id: string
  status: 'present' | 'absent' | 'late' | 'excused'
  check_in_time: string | null
  class_session: {
    id: string
    date: string
    class_schedule: {
      name: string
    }
  }
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function MyClassesPage() {
  const [myClasses, setMyClasses] = useState<ClassSchedule[]>([])
  const [upcomingSessions, setUpcomingSessions] = useState<ClassSession[]>([])
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [studentProfileId, setStudentProfileId] = useState<string | null>(null)
  const [currentBelt, setCurrentBelt] = useState<BeltRank | null>(null)

  useEffect(() => {
    fetchMyClasses()
  }, [])

  const fetchMyClasses = async () => {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get user's student profile with their current belt
    const { data: studentProfileData } = await supabase
      .from('student_profiles')
      .select(`
        id,
        school_id,
        belt_rank_id,
        belt_rank:belt_ranks(id, name, color, display_order)
      `)
      .eq('profile_id', user.id)
      .single()

    const studentProfile = studentProfileData as {
      id: string
      school_id: string
      belt_rank_id: string | null
      belt_rank: BeltRank | null
    } | null

    if (!studentProfile) {
      // User doesn't have a student profile yet
      setLoading(false)
      return
    }

    setStudentProfileId(studentProfile.id)
    setCurrentBelt(studentProfile.belt_rank)

    // If student has a belt, fetch classes for their belt level
    if (studentProfile.belt_rank_id) {
      const { data: classesData } = await supabase
        .from('class_schedules')
        .select(`
          id,
          name,
          description,
          day_of_week,
          start_time,
          end_time,
          max_capacity,
          belt_requirement_id,
          instructor:profiles!class_schedules_instructor_id_fkey(id, full_name),
          belt_requirement:belt_ranks!class_schedules_belt_requirement_id_fkey(id, name, color, display_order)
        `)
        .eq('school_id', studentProfile.school_id)
        .eq('belt_requirement_id', studentProfile.belt_rank_id)
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time')

      if (classesData) {
        setMyClasses(classesData as unknown as ClassSchedule[])

        // Get class IDs for upcoming sessions
        const classIds = classesData.map((c: { id: string }) => c.id)

        if (classIds.length > 0) {
          // Fetch upcoming sessions for these classes
          const today = new Date().toISOString().split('T')[0]
          const { data: sessionsData } = await supabase
            .from('class_sessions')
            .select(`
              id,
              date,
              status,
              notes,
              class_schedule:class_schedules(
                id,
                name,
                start_time,
                end_time
              )
            `)
            .in('class_schedule_id', classIds)
            .gte('date', today)
            .eq('status', 'scheduled')
            .order('date')
            .limit(10)

          if (sessionsData) {
            setUpcomingSessions(sessionsData as unknown as ClassSession[])
          }
        }
      }
    }

    // Fetch recent attendance records
    const { data: attendanceData } = await supabase
      .from('attendance_records')
      .select(`
        id,
        status,
        check_in_time,
        class_session:class_sessions(
          id,
          date,
          class_schedule:class_schedules(name)
        )
      `)
      .eq('student_profile_id', studentProfile.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (attendanceData) {
      setRecentAttendance(attendanceData as unknown as AttendanceRecord[])
    }

    setLoading(false)
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const getAttendanceIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'late':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'excused':
        return <AlertCircle className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  const getAttendanceBadgeColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800'
      case 'absent':
        return 'bg-red-100 text-red-800'
      case 'late':
        return 'bg-yellow-100 text-yellow-800'
      case 'excused':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="p-8">Loading your classes...</div>
  }

  if (!studentProfileId) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Student Profile</h2>
            <p className="text-gray-600 mb-4">
              You don&apos;t have a student profile yet. Please contact your school administrator to set up your student profile.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="h-8 w-8 text-red-500" />
        <div>
          <h1 className="text-2xl font-bold">My Classes</h1>
          <p className="text-gray-600">View your classes based on your belt level</p>
        </div>
      </div>

      {/* Current Belt */}
      {currentBelt && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Award className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-500">Your Current Belt</p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-gray-300"
                    style={{ backgroundColor: currentBelt.color }}
                  />
                  <span className="font-semibold text-lg">{currentBelt.name}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Classes (Belt-Based) */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Your Classes</h2>

        {!currentBelt ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No Belt Assigned</p>
              <p className="text-sm">You haven&apos;t been assigned a belt yet. Once your instructor assigns you a belt, your classes will appear here.</p>
            </CardContent>
          </Card>
        ) : myClasses.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No Classes for Your Belt Level</p>
              <p className="text-sm">There are no classes scheduled for your belt level yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myClasses.map((cls) => (
              <Card key={cls.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    {cls.name}
                    {cls.belt_requirement && (
                      <Badge
                        style={{
                          backgroundColor: cls.belt_requirement.color || '#gray',
                          color: ['#FFFFFF', '#FFFF00', '#FFD700', 'white', 'yellow'].includes(cls.belt_requirement.color || '')
                            ? '#000'
                            : '#fff',
                        }}
                      >
                        {cls.belt_requirement.name}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{DAYS_OF_WEEK[cls.day_of_week]}</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>
                        {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                      </span>
                    </div>

                    {cls.instructor && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="h-4 w-4" />
                        <span>{cls.instructor.full_name}</span>
                      </div>
                    )}

                    {cls.description && (
                      <p className="text-sm text-gray-500 mt-2">{cls.description}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming Sessions */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Upcoming Sessions</h2>

        {upcomingSessions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No upcoming sessions scheduled</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {upcomingSessions.map((session) => (
              <Card key={session.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center bg-red-50 rounded-lg px-3 py-2 min-w-[70px]">
                        <p className="text-xs text-red-600 font-medium">
                          {new Date(session.date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </p>
                        <p className="text-lg font-bold text-red-700">
                          {new Date(session.date).getDate()}
                        </p>
                        <p className="text-xs text-red-600">
                          {new Date(session.date).toLocaleDateString('en-US', { month: 'short' })}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">{session.class_schedule?.name}</p>
                        <p className="text-sm text-gray-500">
                          {session.class_schedule && formatTime(session.class_schedule.start_time)} - {session.class_schedule && formatTime(session.class_schedule.end_time)}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      {session.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Recent Attendance */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Recent Attendance</h2>

        {recentAttendance.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No attendance records yet</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentAttendance.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      {getAttendanceIcon(record.status)}
                      <div>
                        <p className="font-medium">{record.class_session?.class_schedule?.name}</p>
                        <p className="text-sm text-gray-500">
                          {record.class_session?.date && formatDate(record.class_session.date)}
                        </p>
                      </div>
                    </div>
                    <Badge className={getAttendanceBadgeColor(record.status)}>
                      {record.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
