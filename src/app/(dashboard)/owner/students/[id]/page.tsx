'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Save,
  Mail,
  Calendar,
  Award,
  Users,
  QrCode,
  Key,
  Clock,
  CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface BeltRank {
  id: string
  name: string
  color: string
}

interface Family {
  id: string
  name: string
}

interface AttendanceRecord {
  id: string
  check_in_time: string
  class_session?: {
    class?: {
      name: string
    }
  }
}

interface StudentData {
  id: string
  full_name: string
  email: string | null
  avatar_url: string | null
  role: string
  family_id: string | null
  is_approved: boolean
  created_at: string
  student_profile?: {
    id: string
    pin_code: string | null
    belt_rank_id: string | null
    belt_rank: BeltRank | null
    enrollment_date: string | null
  } | null
}

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.id as string

  const [student, setStudent] = useState<StudentData | null>(null)
  const [belts, setBelts] = useState<BeltRank[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [schoolId, setSchoolId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    belt_rank_id: '',
    family_id: '',
  })

  useEffect(() => {
    fetchData()
  }, [studentId])

  const fetchData = async () => {
    const supabase = createClient()
    const { data: authData } = await supabase.auth.getUser()

    if (!authData.user) {
      router.push('/login')
      return
    }

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('school_id, role')
      .eq('id', authData.user.id)
      .single()

    const userProfileData = userProfile as { school_id: string | null; role: string } | null
    if (!userProfileData?.school_id || (userProfileData.role !== 'owner' && userProfileData.role !== 'admin')) {
      router.push('/feed')
      return
    }

    setSchoolId(userProfileData.school_id)

    // Fetch student profile
    const { data: studentData, error: studentError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', studentId)
      .eq('school_id', userProfileData.school_id)
      .single()

    if (studentError || !studentData) {
      toast.error('Student not found')
      router.push('/owner/students')
      return
    }

    const typedStudentData = studentData as {
      id: string
      full_name: string
      email: string | null
      avatar_url: string | null
      role: string
      family_id: string | null
      is_approved: boolean
      created_at: string
    }

    // Fetch student_profile
    const { data: studentProfileData } = await supabase
      .from('student_profiles')
      .select('id, pin_code, belt_rank_id, enrollment_date, belt_rank:belt_ranks(id, name, color)')
      .eq('profile_id', studentId)
      .single()

    const fullStudent: StudentData = {
      ...typedStudentData,
      student_profile: studentProfileData as StudentData['student_profile'],
    }

    setStudent(fullStudent)
    setFormData({
      full_name: fullStudent.full_name || '',
      email: fullStudent.email || '',
      belt_rank_id: fullStudent.student_profile?.belt_rank_id || '',
      family_id: fullStudent.family_id || '',
    })

    // Fetch belts
    const { data: beltsData } = await supabase
      .from('belt_ranks')
      .select('id, name, color')
      .eq('school_id', userProfileData.school_id)
      .order('display_order')

    if (beltsData) {
      setBelts(beltsData)
    }

    // Fetch families
    const { data: familiesData } = await supabase
      .from('families')
      .select('id, name')
      .eq('school_id', userProfileData.school_id)
      .order('name')

    if (familiesData) {
      setFamilies(familiesData)
    }

    // Fetch recent attendance
    const { data: attendanceData } = await supabase
      .from('attendance_records')
      .select('id, check_in_time, class_session:class_sessions(class:classes(name))')
      .eq('student_id', studentId)
      .order('check_in_time', { ascending: false })
      .limit(10)

    if (attendanceData) {
      setAttendance(attendanceData as AttendanceRecord[])
    }

    setLoading(false)
  }

  const handleSave = async () => {
    if (!student || !schoolId) return

    setSaving(true)
    try {
      // Update profile
      const response = await fetch(`/api/students/${studentId}/family`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family_id: formData.family_id || null }),
      })

      if (!response.ok) {
        throw new Error('Failed to update family')
      }

      // Update belt if changed
      if (formData.belt_rank_id !== (student.student_profile?.belt_rank_id || '')) {
        const beltResponse = await fetch(`/api/students/${studentId}/belt`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ belt_rank_id: formData.belt_rank_id || null }),
        })

        if (!beltResponse.ok) {
          throw new Error('Failed to update belt')
        }
      }

      toast.success('Student updated successfully')
      fetchData() // Refresh data
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-32 mb-6" />
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="p-8 text-center">
        <p>Student not found</p>
        <Button variant="outline" onClick={() => router.push('/owner/students')} className="mt-4">
          Back to Students
        </Button>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => router.push('/owner/students')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Members
      </Button>

      <div className="grid gap-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Student Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6 mb-6">
              <Avatar
                src={student.avatar_url}
                name={student.full_name}
                size="xl"
              />
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{student.full_name}</h2>
                {student.email && (
                  <p className="text-gray-500 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {student.email}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="secondary" className="capitalize">
                    {student.role}
                  </Badge>
                  {student.is_approved && (
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Approved
                    </Badge>
                  )}
                  {student.student_profile?.belt_rank && (
                    <Badge
                      style={{
                        backgroundColor: student.student_profile.belt_rank.color,
                        color: student.student_profile.belt_rank.color === '#FFFFFF' ? '#000' : '#fff'
                      }}
                    >
                      {student.student_profile.belt_rank.name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Belt Rank
                </Label>
                <select
                  value={formData.belt_rank_id}
                  onChange={(e) => setFormData({ ...formData, belt_rank_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">No belt assigned</option>
                  {belts.map((belt) => (
                    <option key={belt.id} value={belt.id}>
                      {belt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Family
                </Label>
                <select
                  value={formData.family_id}
                  onChange={(e) => setFormData({ ...formData, family_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">No family assigned</option>
                  {families.map((family) => (
                    <option key={family.id} value={family.id}>
                      {family.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button onClick={handleSave} isLoading={saving}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Info */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Joined</p>
                  <p className="font-medium">{formatDate(student.created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Key className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">PIN Code</p>
                  <p className="font-medium font-mono">
                    {student.student_profile?.pin_code || 'Not set'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Check-ins</p>
                  <p className="font-medium">{attendance.length} recent</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Attendance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendance.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No attendance records yet</p>
            ) : (
              <div className="space-y-2">
                {attendance.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-medium">
                        {record.class_session?.class?.name || 'General Check-in'}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDateTime(record.check_in_time)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
