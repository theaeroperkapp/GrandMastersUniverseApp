'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { User } from 'lucide-react'

interface Member {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  role: string
  is_approved: boolean
  created_at: string
  student_profile?: {
    id: string
    belt_rank: {
      name: string
      color: string
    } | null
    enrollment_date: string | null
  } | null
}

export default function StudentsPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    const supabase = createClient()
    const { data: authData } = await supabase.auth.getUser()

    if (!authData.user) return

    const { data: userProfileData } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', authData.user.id)
      .single()

    const userProfile = userProfileData as { school_id: string | null } | null
    if (!userProfile?.school_id) {
      setLoading(false)
      return
    }

    // Get all approved members (students and parents) from profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, role, is_approved, created_at')
      .eq('school_id', userProfile.school_id)
      .eq('is_approved', true)
      .in('role', ['student', 'parent'])
      .order('created_at', { ascending: false })

    if (profilesData) {
      // Get student_profiles data for these members
      const memberIds = profilesData.map(p => p.id)
      const { data: studentProfilesData } = await supabase
        .from('student_profiles')
        .select('id, profile_id, enrollment_date, belt_rank:belt_ranks(name, color)')
        .in('profile_id', memberIds)

      // Merge the data
      const membersWithDetails = profilesData.map(profile => ({
        ...profile,
        student_profile: studentProfilesData?.find(sp => sp.profile_id === profile.id) || null
      }))

      setMembers(membersWithDetails as Member[])
    }
    setLoading(false)
  }

  const filteredMembers = members.filter(member =>
    member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="p-8">Loading members...</div>
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-gray-500 text-sm">Approved students and parents at your school</p>
        </div>
        <div className="text-sm text-gray-500">
          Total: {members.length} members
        </div>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filteredMembers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <User className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Members Yet</h3>
            <p>Members will appear here after they sign up with your school code and you approve them.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={member.avatar_url}
                    name={member.full_name}
                    size="lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{member.full_name}</h3>
                    <p className="text-sm text-gray-500 truncate">{member.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="capitalize">
                        {member.role}
                      </Badge>
                      {member.student_profile?.belt_rank && (
                        <Badge
                          style={{
                            backgroundColor: member.student_profile.belt_rank.color,
                            color: member.student_profile.belt_rank.color === '#FFFFFF' ? '#000' : '#fff'
                          }}
                        >
                          {member.student_profile.belt_rank.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Joined: {new Date(member.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
