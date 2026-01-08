'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Users, User, Mail, Award, Calendar } from 'lucide-react'

interface BeltRank {
  id: string
  name: string
  color: string
}

interface FamilyMember {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  role: string
  created_at: string
  student_profile?: {
    id: string
    current_belt: BeltRank | null
    enrollment_date: string | null
  } | null
}

interface Family {
  id: string
  name: string
  billing_email: string | null
  primary_holder_id: string
}

export default function MyFamilyPage() {
  const [family, setFamily] = useState<Family | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [isPrimaryHolder, setIsPrimaryHolder] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFamilyData()
  }, [])

  const fetchFamilyData = async () => {
    try {
      const response = await fetch('/api/my-family')
      const data = await response.json()

      if (response.ok) {
        setFamily(data.family)
        setMembers(data.members || [])
        setIsPrimaryHolder(data.isPrimaryHolder || false)
      }
    } catch (error) {
      console.error('Error fetching family data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'parent':
        return 'bg-blue-100 text-blue-800'
      case 'student':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="p-8">Loading family information...</div>
  }

  if (!family) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Family Assigned</h2>
            <p className="text-gray-600">
              You are not currently part of a family group. Contact your school administrator to be added to a family.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const parents = members.filter(m => m.role === 'parent')
  const students = members.filter(m => m.role === 'student')

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Users className="h-8 w-8 text-red-500" />
        <div>
          <h1 className="text-2xl font-bold">{family.name}</h1>
          <p className="text-gray-600">
            {isPrimaryHolder ? 'You are the primary account holder' : 'Family member'}
          </p>
        </div>
      </div>

      {/* Family Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Family Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Billing Email</p>
              <p className="font-medium">{family.billing_email || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Members</p>
              <p className="font-medium">{members.length} member{members.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parents Section */}
      {parents.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <User className="h-5 w-5" />
            Parents / Guardians
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {parents.map((parent) => (
              <Card key={parent.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar
                      src={parent.avatar_url}
                      name={parent.full_name}
                      size="lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{parent.full_name}</p>
                        {family.primary_holder_id === parent.id && (
                          <Badge className="bg-yellow-100 text-yellow-800 text-xs">Primary</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{parent.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Students Section */}
      {students.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Award className="h-5 w-5" />
            Students
          </h2>
          <div className="grid gap-4">
            {students.map((student) => (
              <Card key={student.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar
                      src={student.avatar_url}
                      name={student.full_name}
                      size="lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{student.full_name}</p>
                        <Badge className={getRoleBadgeColor('student')}>Student</Badge>
                        {family.primary_holder_id === student.id && (
                          <Badge className="bg-yellow-100 text-yellow-800 text-xs">Primary</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{student.email}</p>

                      <div className="flex flex-wrap gap-4 mt-2 text-sm">
                        {student.student_profile?.current_belt && (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: student.student_profile.current_belt.color }}
                            />
                            <span className="text-gray-600">
                              {student.student_profile.current_belt.name} Belt
                            </span>
                          </div>
                        )}
                        {student.student_profile?.enrollment_date && (
                          <div className="flex items-center gap-1 text-gray-500">
                            <Calendar className="h-4 w-4" />
                            <span>Enrolled {formatDate(student.student_profile.enrollment_date)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {members.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No family members found</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
