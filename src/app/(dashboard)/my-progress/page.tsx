'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Award,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  Target,
  Zap,
  History,
} from 'lucide-react'

interface BeltRank {
  id: string
  name: string
  color: string
  display_order: number
}

interface RankHistoryItem {
  id: string
  promoted_at: string
  notes: string | null
  belt: BeltRank | null
  promoted_by_profile: {
    id: string
    full_name: string
  } | null
}

interface AttendanceRecord {
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
}

interface StudentProfile {
  id: string
  schoolId: string
  enrollmentDate: string | null
  currentBelt: BeltRank | null
  daysSinceEnrollment: number
}

interface AttendanceStats {
  totalClasses: number
  classesLast30Days: number
}

interface ProgressData {
  studentProfile: StudentProfile | null
  rankHistory: RankHistoryItem[]
  attendanceStats: AttendanceStats | null
  recentAttendance: AttendanceRecord[]
  allBelts: BeltRank[]
}

export default function MyProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProgress()
  }, [])

  const fetchProgress = async () => {
    try {
      const response = await fetch('/api/my-progress')
      if (!response.ok) {
        throw new Error('Failed to fetch progress data')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const getCheckInMethodLabel = (method: string) => {
    switch (method) {
      case 'qr':
        return 'QR Code'
      case 'pin':
        return 'PIN'
      case 'manual':
        return 'Manual'
      default:
        return method
    }
  }

  const getBeltTextColor = (color: string) => {
    const lightColors = ['#FFFFFF', '#FFFF00', '#FFD700', 'white', 'yellow', '#FFF', '#FF0']
    return lightColors.some(c => color?.toLowerCase() === c.toLowerCase()) ? '#000' : '#fff'
  }

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="h-8 w-8 text-red-500" />
          <div>
            <h1 className="text-2xl font-bold">My Progress</h1>
            <p className="text-gray-600">Loading your progress...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-red-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Loading Progress</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data?.studentProfile) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Student Profile</h2>
            <p className="text-gray-600 mb-4">
              You don&apos;t have a student profile yet. Please contact your school administrator to set up your student profile.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { studentProfile, rankHistory, attendanceStats, recentAttendance, allBelts } = data

  // Calculate belt progress based on enabled belts only
  const currentBeltOrder = studentProfile.currentBelt?.display_order || 0
  const totalBelts = allBelts.length
  const achievedBelts = allBelts.filter(b => b.display_order <= currentBeltOrder).length
  const progressPercentage = totalBelts > 0 ? Math.round((achievedBelts / totalBelts) * 100) : 0

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="h-8 w-8 text-red-500" />
        <div>
          <h1 className="text-2xl font-bold">My Progress</h1>
          <p className="text-gray-600">Track your martial arts journey</p>
        </div>
      </div>

      {/* Current Belt - Prominent Display */}
      <Card className="mb-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Left: Current Belt Info */}
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full border-4 border-white/30 shadow-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: studentProfile.currentBelt?.color || '#gray' }}
              >
                <Award className="h-8 w-8" style={{ color: getBeltTextColor(studentProfile.currentBelt?.color || '') }} />
              </div>
              <div>
                <p className="text-gray-300 text-sm">Current Rank</p>
                <h2 className="text-2xl font-bold">
                  {studentProfile.currentBelt?.name || 'No Belt Assigned'}
                </h2>
                {rankHistory.length > 0 && (
                  <p className="text-gray-400 text-sm">
                    Promoted {formatDate(rankHistory[0].promoted_at)}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Belt Progress Bar */}
            <div>
              <div className="flex justify-between text-sm text-gray-300 mb-1">
                <span>Belt Progress</span>
                <span>{progressPercentage}%</span>
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {achievedBelts} of {totalBelts} ranks achieved
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Classes</p>
                <p className="text-2xl font-bold">{attendanceStats?.totalClasses || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Last 30 Days</p>
                <p className="text-2xl font-bold">{attendanceStats?.classesLast30Days || 0} classes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Training Since</p>
                <p className="text-2xl font-bold">
                  {studentProfile.daysSinceEnrollment > 0
                    ? `${studentProfile.daysSinceEnrollment} days`
                    : 'Today'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Belt Progression Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-red-500" />
              Belt Progression
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rankHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No Promotions Yet</p>
                <p className="text-sm">Your belt promotion history will appear here</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                <div className="space-y-6">
                  {rankHistory.map((item, index) => (
                    <div key={item.id} className="relative flex gap-4">
                      {/* Timeline dot */}
                      <div
                        className="relative z-10 w-8 h-8 rounded-full border-4 border-white shadow flex-shrink-0"
                        style={{ backgroundColor: item.belt?.color || '#gray' }}
                      />

                      {/* Content */}
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{item.belt?.name}</span>
                          {index === 0 && (
                            <Badge className="bg-green-100 text-green-800 text-xs">Current</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {formatDate(item.promoted_at)}
                        </p>
                        {item.promoted_by_profile && (
                          <p className="text-sm text-gray-500">
                            Promoted by {item.promoted_by_profile.full_name}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-sm text-gray-600 mt-1 italic">&quot;{item.notes}&quot;</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Attendance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-red-500" />
              Recent Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAttendance.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No Attendance Records</p>
                <p className="text-sm">Your class attendance will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAttendance.map((record) => {
                  const className = record.class_session?.class_schedule?.name
                  const sessionDate = record.class_session?.date
                  const checkInDate = new Date(record.check_in_time)

                  return (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">
                            {className || 'Training Session'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {sessionDate
                              ? formatDate(sessionDate)
                              : formatDate(checkInDate.toISOString())
                            }
                            {' at '}
                            {formatTime(record.check_in_time)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {getCheckInMethodLabel(record.check_in_method)}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Belt Journey Visualization */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-red-500" />
            Belt Journey
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {allBelts.map((belt) => {
              const isAchieved = belt.display_order <= currentBeltOrder
              const isCurrent = belt.id === studentProfile.currentBelt?.id

              return (
                <div
                  key={belt.id}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                    isCurrent
                      ? 'border-red-500 shadow-md scale-105'
                      : isAchieved
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 bg-gray-50 opacity-50'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: belt.color }}
                  />
                  <span className={`text-sm ${isAchieved ? 'font-medium' : 'text-gray-500'}`}>
                    {belt.name}
                  </span>
                  {isCurrent && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      You
                    </span>
                  )}
                  {isAchieved && !isCurrent && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
