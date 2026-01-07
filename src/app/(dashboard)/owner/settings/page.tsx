'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import toast from 'react-hot-toast'

interface School {
  id: string
  name: string
  subdomain: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  website: string | null
  monthly_post_limit: number
  announcement_limit: number
}

export default function SettingsPage() {
  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSchool()
  }, [])

  const fetchSchool = async () => {
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
      .from('schools')
      .select('*')
      .eq('id', userProfile.school_id)
      .single()

    if (data) {
      setSchool(data)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!school) return

    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('schools')
      .update({
        name: school.name,
        email: school.email,
        phone: school.phone,
        address: school.address,
        city: school.city,
        state: school.state,
        zip: school.zip,
        website: school.website,
      } as never)
      .eq('id', school.id)

    if (error) {
      toast.error('Failed to save settings')
    } else {
      toast.success('Settings saved')
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="p-8">Loading settings...</div>
  }

  if (!school) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No school found. Please contact support.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">School Settings</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>School Information</CardTitle>
            <CardDescription>Basic information about your school</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">School Name</Label>
              <Input
                id="name"
                value={school.name}
                onChange={(e) => setSchool({ ...school, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="subdomain">School Code / Subdomain</Label>
              <Input
                id="subdomain"
                value={school.subdomain}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Students use this code to join your school
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={school.email || ''}
                  onChange={(e) => setSchool({ ...school, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={school.phone || ''}
                  onChange={(e) => setSchool({ ...school, phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={school.website || ''}
                onChange={(e) => setSchool({ ...school, website: e.target.value })}
                placeholder="https://yourschool.com"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
            <CardDescription>Physical location of your school</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                value={school.address || ''}
                onChange={(e) => setSchool({ ...school, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={school.city || ''}
                  onChange={(e) => setSchool({ ...school, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={school.state || ''}
                  onChange={(e) => setSchool({ ...school, state: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  value={school.zip || ''}
                  onChange={(e) => setSchool({ ...school, zip: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limits</CardTitle>
            <CardDescription>Usage limits for your school</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monthly Post Limit</Label>
                <p className="text-2xl font-bold">{school.monthly_post_limit}</p>
                <p className="text-xs text-gray-500">Posts per member per month</p>
              </div>
              <div>
                <Label>Announcement Limit</Label>
                <p className="text-2xl font-bold">{school.announcement_limit}</p>
                <p className="text-xs text-gray-500">Active announcements</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
