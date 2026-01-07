'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Student {
  id: string
  profile_id: string
  belt_rank_id: string | null
  enrollment_date: string | null
  profile: {
    full_name: string
    email: string
    avatar_url: string | null
  }
  belt_rank: {
    name: string
    color: string
  } | null
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    const supabase = createClient()
    const { data: profile } = await supabase.auth.getUser()

    if (!profile.user) return

    const { data: userProfileData } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', profile.user.id)
      .single()

    const userProfile = userProfileData as unknown as { school_id: string | null } | null
    if (!userProfile?.school_id) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('student_profiles')
      .select(`
        id,
        profile_id,
        belt_rank_id,
        enrollment_date,
        profile:profiles(full_name, email, avatar_url),
        belt_rank:belt_ranks(name, color)
      `)
      .eq('school_id', userProfile.school_id)
      .order('created_at', { ascending: false })

    if (data) {
      setStudents(data as unknown as Student[])
    }
    setLoading(false)
  }

  const filteredStudents = students.filter(student =>
    student.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="p-8">Loading students...</div>
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Students</h1>
        <Button>Add Student</Button>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search students..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No students found. Students will appear here when they sign up with your school code.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStudents.map((student) => (
            <Card key={student.id}>
              <CardHeader>
                <CardTitle className="text-lg">{student.profile?.full_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-2">{student.profile?.email}</p>
                {student.belt_rank && (
                  <Badge style={{ backgroundColor: student.belt_rank.color, color: student.belt_rank.color === '#FFFFFF' ? '#000' : '#fff' }}>
                    {student.belt_rank.name}
                  </Badge>
                )}
                {student.enrollment_date && (
                  <p className="text-xs text-gray-400 mt-2">
                    Enrolled: {new Date(student.enrollment_date).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
