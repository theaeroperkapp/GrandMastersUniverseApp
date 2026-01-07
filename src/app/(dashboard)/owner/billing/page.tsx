'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Membership {
  id: string
  name: string
  price: number
  billing_period: string
  family_discount_percent: number
}

interface CustomCharge {
  id: string
  description: string
  amount: number
  status: string
  due_date: string | null
  family: {
    name: string
  }
}

export default function BillingPage() {
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [charges, setCharges] = useState<CustomCharge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBillingData()
  }, [])

  const fetchBillingData = async () => {
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

    const [membershipsRes, chargesRes] = await Promise.all([
      supabase
        .from('memberships')
        .select('*')
        .eq('school_id', userProfile.school_id)
        .eq('is_active', true),
      supabase
        .from('custom_charges')
        .select(`
          *,
          family:families(name)
        `)
        .eq('school_id', userProfile.school_id)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    if (membershipsRes.data) setMemberships(membershipsRes.data)
    if (chargesRes.data) setCharges(chargesRes.data as unknown as CustomCharge[])
    setLoading(false)
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  if (loading) {
    return <div className="p-8">Loading billing...</div>
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Billing</h1>
        <div className="flex gap-2">
          <Button variant="outline">Create Membership</Button>
          <Button>Add Custom Charge</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Membership Plans</CardTitle>
            <CardDescription>Configure your tuition plans</CardDescription>
          </CardHeader>
          <CardContent>
            {memberships.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No membership plans created yet.
              </p>
            ) : (
              <div className="space-y-4">
                {memberships.map((membership) => (
                  <div
                    key={membership.id}
                    className="flex justify-between items-center p-4 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium">{membership.name}</h3>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(membership.price)}/{membership.billing_period}
                      </p>
                      {membership.family_discount_percent > 0 && (
                        <p className="text-xs text-green-600">
                          {membership.family_discount_percent}% family discount
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Charges</CardTitle>
            <CardDescription>Custom charges and fees</CardDescription>
          </CardHeader>
          <CardContent>
            {charges.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No custom charges yet.
              </p>
            ) : (
              <div className="space-y-4">
                {charges.map((charge) => (
                  <div
                    key={charge.id}
                    className="flex justify-between items-center p-4 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium">{charge.description}</h3>
                      <p className="text-sm text-gray-500">{charge.family?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(charge.amount)}</p>
                      <Badge variant={charge.status === 'paid' ? 'default' : 'secondary'}>
                        {charge.status}
                      </Badge>
                    </div>
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
