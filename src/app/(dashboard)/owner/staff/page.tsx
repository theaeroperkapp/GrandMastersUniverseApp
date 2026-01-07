'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface StaffMember {
  id: string
  full_name: string
  email: string
  role: string
  sub_roles: string[]
  is_approved: boolean
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
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
      .from('profiles')
      .select('id, full_name, email, role, sub_roles, is_approved')
      .eq('school_id', userProfile.school_id)
      .in('role', ['owner'])
      .order('created_at', { ascending: false })

    if (data) {
      setStaff(data)
    }
    setLoading(false)
  }

  const filteredStaff = staff.filter(member =>
    member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="p-8">Loading staff...</div>
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Staff</h1>
        <Button>Invite Staff Member</Button>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search staff..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filteredStaff.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No staff members found. Invite staff members to help manage your school.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStaff.map((member) => (
            <Card key={member.id}>
              <CardHeader>
                <CardTitle className="text-lg">{member.full_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-2">{member.email}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge>{member.role}</Badge>
                  {member.sub_roles?.map((subRole) => (
                    <Badge key={subRole} variant="outline">
                      {subRole.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Staff Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Owner</h3>
              <p className="text-sm text-gray-500">Full access to all school features</p>
            </div>
            <div>
              <h3 className="font-medium">Community Manager</h3>
              <p className="text-sm text-gray-500">Can manage posts, announcements, and communications</p>
            </div>
            <div>
              <h3 className="font-medium">Billing Coordinator</h3>
              <p className="text-sm text-gray-500">Can manage billing, memberships, and payments</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
