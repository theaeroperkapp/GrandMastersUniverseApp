'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import toast from 'react-hot-toast'

interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()

    if (!auth.user) return

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', auth.user.id)
      .single()

    if (data) {
      const profileData = data as unknown as Profile
      setProfile(profileData)
      setFullName(profileData.full_name)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!profile) return

    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName } as never)
      .eq('id', profile.id)

    if (error) {
      toast.error('Failed to update profile')
    } else {
      toast.success('Profile updated')
      setProfile({ ...profile, full_name: fullName })
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="p-8">Loading profile...</div>
  }

  if (!profile) {
    return <div className="p-8">Profile not found</div>
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={profile.email}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <Label>Role</Label>
            <Input
              value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              disabled
              className="bg-gray-50"
            />
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            To change your password, use the password reset feature.
          </p>
          <a href="/reset-password">
            <Button variant="outline">Reset Password</Button>
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
