'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface School {
  id: string
  name: string
  subdomain: string
  subscription_status: string
  trial_ends_at: string | null
  monthly_post_limit: number
  announcement_limit: number
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  owner_id: string
  created_at: string
}

export default function SchoolFeaturesPage() {
  const params = useParams()
  const router = useRouter()
  const schoolId = params.id as string

  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkAdminAndFetch()
  }, [schoolId])

  const checkAdminAndFetch = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: string } | null
    if (!profileData || profileData.role !== 'admin') {
      router.push('/feed')
      return
    }

    setIsAdmin(true)

    // Fetch school
    const { data: schoolData, error } = await supabase
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .single()

    if (error || !schoolData) {
      toast.error('School not found')
      router.push('/admin/schools')
      return
    }

    setSchool(schoolData as School)
    setLoading(false)
  }

  const handleSave = async () => {
    if (!school) return

    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('schools')
      .update({
        subscription_status: school.subscription_status,
        trial_ends_at: school.trial_ends_at,
        monthly_post_limit: school.monthly_post_limit,
        announcement_limit: school.announcement_limit,
      } as never)
      .eq('id', school.id)

    if (error) {
      toast.error('Failed to save settings')
      console.error(error)
    } else {
      toast.success('School settings saved')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  if (!school || !isAdmin) {
    return null
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <Link
          href="/admin/schools"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Schools
        </Link>
        <h1 className="text-2xl font-bold">{school.name}</h1>
        <p className="text-gray-500">{school.subdomain}.grandmastersuniverse.com</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>Manage the school&apos;s subscription and billing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                value={school.subscription_status}
                onChange={(e) => setSchool({ ...school, subscription_status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="trialing">Trialing</option>
                <option value="past_due">Past Due</option>
                <option value="canceled">Canceled</option>
                <option value="incomplete">Incomplete</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="trial_ends">Trial Ends At</Label>
              <Input
                id="trial_ends"
                type="datetime-local"
                value={school.trial_ends_at ? new Date(school.trial_ends_at).toISOString().slice(0, 16) : ''}
                onChange={(e) => setSchool({
                  ...school,
                  trial_ends_at: e.target.value ? new Date(e.target.value).toISOString() : null
                })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty if not on trial
              </p>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Stripe Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Customer ID:</span>
                  <p className="font-mono">{school.stripe_customer_id || 'Not set'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Subscription ID:</span>
                  <p className="font-mono">{school.stripe_subscription_id || 'Not set'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage Limits</CardTitle>
            <CardDescription>Configure usage limits for this school</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="post_limit">Monthly Post Limit</Label>
                <Input
                  id="post_limit"
                  type="number"
                  min={1}
                  value={school.monthly_post_limit}
                  onChange={(e) => setSchool({
                    ...school,
                    monthly_post_limit: parseInt(e.target.value) || 10
                  })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Posts per member per month
                </p>
              </div>
              <div>
                <Label htmlFor="announcement_limit">Announcement Limit</Label>
                <Input
                  id="announcement_limit"
                  type="number"
                  min={1}
                  value={school.announcement_limit}
                  onChange={(e) => setSchool({
                    ...school,
                    announcement_limit: parseInt(e.target.value) || 5
                  })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum active announcements
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>School Details</CardTitle>
            <CardDescription>Read-only information about this school</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">School ID:</span>
                <p className="font-mono">{school.id}</p>
              </div>
              <div>
                <span className="text-gray-500">Owner ID:</span>
                <p className="font-mono">{school.owner_id}</p>
              </div>
              <div>
                <span className="text-gray-500">Created:</span>
                <p>{new Date(school.created_at).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Link href="/admin/schools">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
