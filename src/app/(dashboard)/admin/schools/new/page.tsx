'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import toast from 'react-hot-toast'

export default function NewSchoolPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    ownerEmail: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      // First, find or create the owner
      let ownerId: string | null = null

      if (formData.ownerEmail) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', formData.ownerEmail)
          .single()

        if (ownerProfile) {
          const profile = ownerProfile as unknown as { id: string }
          ownerId = profile.id

          // Update owner role
          await supabase
            .from('profiles')
            .update({ role: 'owner', is_approved: true } as never)
            .eq('id', ownerId)
        } else {
          toast.error('Owner email not found. They must sign up first.')
          setLoading(false)
          return
        }
      }

      if (!ownerId) {
        toast.error('Owner email is required')
        setLoading(false)
        return
      }

      // Create the school
      const { error } = await supabase.from('schools').insert({
        name: formData.name,
        subdomain: formData.subdomain.toLowerCase().replace(/[^a-z0-9]/g, ''),
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        owner_id: ownerId,
        subscription_status: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      } as never)

      if (error) {
        if (error.code === '23505') {
          toast.error('A school with this subdomain already exists')
        } else {
          toast.error(error.message)
        }
      } else {
        toast.success('School created successfully')
        router.push('/admin/schools')
      }
    } catch (err) {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Create New School</h1>

      <Card>
        <CardHeader>
          <CardTitle>School Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">School Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="subdomain">Subdomain *</Label>
              <div className="flex items-center">
                <Input
                  id="subdomain"
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                  required
                  className="rounded-r-none"
                />
                <span className="bg-gray-100 border border-l-0 px-3 py-2 rounded-r-md text-gray-500">
                  .grandmasters.app
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This will be the school&apos;s unique URL and code for students to join
              </p>
            </div>

            <div>
              <Label htmlFor="ownerEmail">Owner Email *</Label>
              <Input
                id="ownerEmail"
                type="email"
                value={formData.ownerEmail}
                onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                required
                placeholder="owner@example.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                The owner must have an existing account
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">School Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="zip">ZIP</Label>
                <Input
                  id="zip"
                  value={formData.zip}
                  onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create School'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
