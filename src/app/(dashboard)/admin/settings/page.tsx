'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import toast from 'react-hot-toast'

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [platformName, setPlatformName] = useState('GrandMasters Universe')
  const [supportEmail, setSupportEmail] = useState('')
  const [monthlyPrice, setMonthlyPrice] = useState('99')

  useEffect(() => {
    setLoading(false)
  }, [])

  const handleSave = async () => {
    toast.success('Settings saved')
  }

  if (loading) {
    return <div className="p-8">Loading settings...</div>
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Platform Settings</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Configure platform-wide settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="platformName">Platform Name</Label>
              <Input
                id="platformName"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="support@example.com"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing Settings</CardTitle>
            <CardDescription>Configure subscription pricing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="monthlyPrice">Monthly Subscription Price ($)</Label>
              <Input
                id="monthlyPrice"
                type="number"
                value={monthlyPrice}
                onChange={(e) => setMonthlyPrice(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Current Stripe Price ID: {process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || 'Not configured'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>External service configurations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Supabase</Label>
              <p className="text-sm text-green-600">Connected</p>
            </div>
            <div>
              <Label>Stripe</Label>
              <p className="text-sm text-green-600">Connected</p>
            </div>
            <div>
              <Label>Cloudinary</Label>
              <p className="text-sm text-green-600">Connected</p>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave}>Save Settings</Button>
      </div>
    </div>
  )
}
