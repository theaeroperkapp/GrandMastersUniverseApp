'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, User, Users, Award } from 'lucide-react'

interface BeltRank {
  id: string
  name: string
  color: string
}

interface Instructor {
  id: string
  full_name: string
}

interface ClassSchedule {
  id: string
  name: string
  description: string | null
  day_of_week: number
  start_time: string
  end_time: string
  max_capacity: number | null
  is_active: boolean
  instructor: Instructor | null
  belt_requirement: BeltRank | null
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const DAY_ABBREVIATIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function SchedulePage() {
  const [classes, setClasses] = useState<ClassSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay())

  useEffect(() => {
    fetchSchedule()
  }, [])

  const fetchSchedule = async () => {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get user's school_id
    const { data: profileData } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single()

    const profile = profileData as { school_id: string | null } | null

    if (!profile?.school_id) {
      setLoading(false)
      return
    }

    // Fetch class schedules
    const { data, error } = await supabase
      .from('class_schedules')
      .select(`
        id,
        name,
        description,
        day_of_week,
        start_time,
        end_time,
        max_capacity,
        is_active,
        instructor:profiles!class_schedules_instructor_id_fkey(id, full_name),
        belt_requirement:belt_ranks!class_schedules_belt_requirement_id_fkey(id, name, color)
      `)
      .eq('school_id', profile.school_id)
      .eq('is_active', true)
      .order('start_time')

    if (error) {
      console.error('Error fetching schedule:', error)
    } else if (data) {
      setClasses(data as unknown as ClassSchedule[])
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

  const getClassesForDay = (dayOfWeek: number) => {
    return classes.filter(c => c.day_of_week === dayOfWeek)
  }

  const getTodayClasses = () => {
    const today = new Date().getDay()
    return getClassesForDay(today)
  }

  if (loading) {
    return <div className="p-8 text-gray-900 dark:text-white">Loading schedule...</div>
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="h-8 w-8 text-red-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Class Schedule</h1>
          <p className="text-gray-600 dark:text-gray-400">View weekly class schedule</p>
        </div>
      </div>

      {/* Day Selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {DAYS_OF_WEEK.map((day, index) => {
          const isToday = index === new Date().getDay()
          const classCount = getClassesForDay(index).length
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(index)}
              className={`flex flex-col items-center px-4 py-3 rounded-lg min-w-[80px] transition-colors ${
                selectedDay === index
                  ? 'bg-red-500 text-white'
                  : isToday
                  ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <span className="text-xs font-medium">{DAY_ABBREVIATIONS[index]}</span>
              <span className="text-lg font-bold">{classCount}</span>
              <span className="text-xs">{classCount === 1 ? 'class' : 'classes'}</span>
            </button>
          )
        })}
      </div>

      {/* Selected Day's Classes */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
          {DAYS_OF_WEEK[selectedDay]}
          {selectedDay === new Date().getDay() && (
            <Badge className="bg-green-500">Today</Badge>
          )}
        </h2>

        {getClassesForDay(selectedDay).length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No classes scheduled</p>
              <p className="text-sm">There are no classes on {DAYS_OF_WEEK[selectedDay]}.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {getClassesForDay(selectedDay).map((cls) => (
              <Card key={cls.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    {cls.name}
                    {cls.belt_requirement && (
                      <Badge
                        style={{
                          backgroundColor: cls.belt_requirement.color || '#gray',
                          color: ['white', 'yellow', '#FFD700'].includes(cls.belt_requirement.color?.toLowerCase() || '')
                            ? '#000'
                            : '#fff',
                        }}
                      >
                        {cls.belt_requirement.name}+
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Clock className="h-4 w-4" />
                      <span>
                        {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                      </span>
                    </div>

                    {cls.instructor && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <User className="h-4 w-4" />
                        <span>{cls.instructor.full_name}</span>
                      </div>
                    )}

                    {cls.max_capacity && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Users className="h-4 w-4" />
                        <span>Max {cls.max_capacity} students</span>
                      </div>
                    )}

                    {cls.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{cls.description}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Full Week Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {DAYS_OF_WEEK.map((day, index) => (
                    <th
                      key={day}
                      className={`px-2 py-3 text-sm font-medium text-center ${
                        index === new Date().getDay() ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300' : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {DAY_ABBREVIATIONS[index]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {DAYS_OF_WEEK.map((day, index) => {
                    const dayClasses = getClassesForDay(index)
                    return (
                      <td
                        key={day}
                        className={`px-2 py-3 align-top border-r border-gray-200 dark:border-gray-700 last:border-r-0 ${
                          index === new Date().getDay() ? 'bg-red-50 dark:bg-red-950' : ''
                        }`}
                      >
                        <div className="space-y-2">
                          {dayClasses.length === 0 ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">-</p>
                          ) : (
                            dayClasses.map((cls) => (
                              <div
                                key={cls.id}
                                className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                                onClick={() => setSelectedDay(index)}
                              >
                                <p className="font-medium truncate text-gray-900 dark:text-white">{cls.name}</p>
                                <p className="text-gray-500 dark:text-gray-400">
                                  {formatTime(cls.start_time)}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
