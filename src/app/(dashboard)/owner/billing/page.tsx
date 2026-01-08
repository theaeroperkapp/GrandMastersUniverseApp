'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { BeltTestFees } from '@/components/owner/belt-test-fees'

interface Membership {
  id: string
  name: string
  description: string | null
  price: number
  billing_period: string
  family_discount_percent: number
  is_active: boolean
}

interface CustomCharge {
  id: string
  description: string
  amount: number
  status: string
  due_date: string | null
  family_id: string
  family: {
    name: string
  }
}

interface Family {
  id: string
  name: string
}

const BILLING_PERIODS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
]

export default function BillingPage() {
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [charges, setCharges] = useState<CustomCharge[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)
  const [schoolId, setSchoolId] = useState<string | null>(null)

  // Membership modal state
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false)
  const [editingMembership, setEditingMembership] = useState<Membership | null>(null)
  const [membershipForm, setMembershipForm] = useState({
    name: '',
    description: '',
    price: '',
    billing_period: 'monthly',
    family_discount_percent: '0',
  })

  // Custom charge modal state
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false)
  const [chargeForm, setChargeForm] = useState({
    description: '',
    amount: '',
    family_id: '',
    due_date: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

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

    setSchoolId(userProfile.school_id)

    const [membershipsRes, chargesRes, familiesRes] = await Promise.all([
      supabase
        .from('memberships')
        .select('*')
        .eq('school_id', userProfile.school_id)
        .order('created_at', { ascending: false }),
      supabase
        .from('custom_charges')
        .select(`
          *,
          family:families(name)
        `)
        .eq('school_id', userProfile.school_id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('families')
        .select('id, name')
        .eq('school_id', userProfile.school_id)
        .order('name'),
    ])

    if (membershipsRes.data) setMemberships(membershipsRes.data)
    if (chargesRes.data) setCharges(chargesRes.data as unknown as CustomCharge[])
    if (familiesRes.data) setFamilies(familiesRes.data)
    setLoading(false)
  }

  const openCreateMembershipModal = () => {
    setEditingMembership(null)
    setMembershipForm({
      name: '',
      description: '',
      price: '',
      billing_period: 'monthly',
      family_discount_percent: '0',
    })
    setIsMembershipModalOpen(true)
  }

  const openEditMembershipModal = (membership: Membership) => {
    setEditingMembership(membership)
    setMembershipForm({
      name: membership.name,
      description: membership.description || '',
      price: (membership.price / 100).toString(),
      billing_period: membership.billing_period,
      family_discount_percent: membership.family_discount_percent.toString(),
    })
    setIsMembershipModalOpen(true)
  }

  const handleMembershipSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schoolId) return

    setIsSubmitting(true)
    const supabase = createClient()

    try {
      const priceInCents = Math.round(parseFloat(membershipForm.price) * 100)

      if (editingMembership) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('memberships') as any)
          .update({
            name: membershipForm.name,
            description: membershipForm.description || null,
            price: priceInCents,
            billing_period: membershipForm.billing_period,
            family_discount_percent: parseFloat(membershipForm.family_discount_percent) || 0,
          })
          .eq('id', editingMembership.id)

        if (error) throw error
        toast.success('Membership updated successfully')
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('memberships') as any)
          .insert({
            school_id: schoolId,
            name: membershipForm.name,
            description: membershipForm.description || null,
            price: priceInCents,
            billing_period: membershipForm.billing_period,
            family_discount_percent: parseFloat(membershipForm.family_discount_percent) || 0,
            is_active: true,
          })

        if (error) throw error
        toast.success('Membership created successfully')
      }

      setIsMembershipModalOpen(false)
      fetchBillingData()
    } catch (error) {
      console.error('Error saving membership:', error)
      toast.error('Failed to save membership')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleMembershipActive = async (membership: Membership) => {
    const supabase = createClient()

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('memberships') as any)
        .update({ is_active: !membership.is_active })
        .eq('id', membership.id)

      if (error) throw error

      toast.success(membership.is_active ? 'Membership deactivated' : 'Membership activated')
      fetchBillingData()
    } catch (error) {
      console.error('Error toggling membership:', error)
      toast.error('Failed to update membership')
    }
  }

  const deleteMembership = async (id: string) => {
    if (!confirm('Are you sure you want to delete this membership plan?')) return

    const supabase = createClient()

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('memberships') as any)
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Membership deleted')
      fetchBillingData()
    } catch (error) {
      console.error('Error deleting membership:', error)
      toast.error('Failed to delete membership')
    }
  }

  const openChargeModal = () => {
    setChargeForm({
      description: '',
      amount: '',
      family_id: '',
      due_date: '',
    })
    setIsChargeModalOpen(true)
  }

  const handleChargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schoolId || !chargeForm.family_id) return

    setIsSubmitting(true)
    const supabase = createClient()

    try {
      const amountInCents = Math.round(parseFloat(chargeForm.amount) * 100)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('custom_charges') as any)
        .insert({
          school_id: schoolId,
          family_id: chargeForm.family_id,
          description: chargeForm.description,
          amount: amountInCents,
          due_date: chargeForm.due_date || null,
          status: 'pending',
        })

      if (error) throw error

      toast.success('Custom charge created')
      setIsChargeModalOpen(false)
      fetchBillingData()
    } catch (error) {
      console.error('Error creating charge:', error)
      toast.error('Failed to create charge')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateChargeStatus = async (chargeId: string, newStatus: string) => {
    const supabase = createClient()

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('custom_charges') as any)
        .update({ status: newStatus })
        .eq('id', chargeId)

      if (error) throw error

      toast.success(`Charge marked as ${newStatus}`)
      fetchBillingData()
    } catch (error) {
      console.error('Error updating charge:', error)
      toast.error('Failed to update charge')
    }
  }

  const deleteCharge = async (id: string) => {
    if (!confirm('Are you sure you want to delete this charge?')) return

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('custom_charges')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Charge deleted')
      fetchBillingData()
    } catch (error) {
      console.error('Error deleting charge:', error)
      toast.error('Failed to delete charge')
    }
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
        <div>
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="text-gray-600">Manage membership plans and charges</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openCreateMembershipModal}>
            <Plus className="h-4 w-4 mr-2" />
            Create Membership
          </Button>
          <Button onClick={openChargeModal}>
            <DollarSign className="h-4 w-4 mr-2" />
            Add Custom Charge
          </Button>
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
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No membership plans created yet.</p>
                <Button variant="outline" size="sm" onClick={openCreateMembershipModal}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Membership
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {memberships.map((membership) => (
                  <div
                    key={membership.id}
                    className={`flex justify-between items-center p-4 border rounded-lg ${!membership.is_active ? 'opacity-60' : ''}`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{membership.name}</h3>
                        {!membership.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(membership.price)}/{membership.billing_period}
                      </p>
                      {membership.family_discount_percent > 0 && (
                        <p className="text-xs text-green-600">
                          {membership.family_discount_percent}% family discount
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditMembershipModal(membership)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleMembershipActive(membership)}>
                        {membership.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteMembership(membership.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
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
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No custom charges yet.</p>
                <Button variant="outline" size="sm" onClick={openChargeModal}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Charge
                </Button>
              </div>
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
                      {charge.due_date && (
                        <p className="text-xs text-gray-400">
                          Due: {new Date(charge.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(charge.amount)}</p>
                        <Badge
                          variant={charge.status === 'paid' ? 'default' : 'secondary'}
                          className={charge.status === 'paid' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {charge.status}
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-1">
                        {charge.status !== 'paid' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateChargeStatus(charge.id, 'paid')}
                            className="text-xs"
                          >
                            Mark Paid
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCharge(charge.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Belt Test Fees */}
      {schoolId && (
        <div className="mt-6">
          <BeltTestFees schoolId={schoolId} />
        </div>
      )}

      {/* Create/Edit Membership Modal */}
      <Modal
        isOpen={isMembershipModalOpen}
        onClose={() => setIsMembershipModalOpen(false)}
        title={editingMembership ? 'Edit Membership' : 'Create Membership'}
      >
        <form onSubmit={handleMembershipSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Plan Name *</Label>
            <Input
              id="name"
              value={membershipForm.name}
              onChange={(e) => setMembershipForm({ ...membershipForm, name: e.target.value })}
              placeholder="e.g., Basic Monthly"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={membershipForm.description}
              onChange={(e) => setMembershipForm({ ...membershipForm, description: e.target.value })}
              placeholder="Describe what's included in this plan"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (USD) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={membershipForm.price}
                onChange={(e) => setMembershipForm({ ...membershipForm, price: e.target.value })}
                placeholder="99.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="billing_period">Billing Period</Label>
              <select
                id="billing_period"
                value={membershipForm.billing_period}
                onChange={(e) => setMembershipForm({ ...membershipForm, billing_period: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {BILLING_PERIODS.map((period) => (
                  <option key={period.value} value={period.value}>{period.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="family_discount">Family Discount (%)</Label>
            <Input
              id="family_discount"
              type="number"
              min="0"
              max="100"
              value={membershipForm.family_discount_percent}
              onChange={(e) => setMembershipForm({ ...membershipForm, family_discount_percent: e.target.value })}
              placeholder="0"
            />
            <p className="text-xs text-gray-500">Discount applied to additional family members</p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsMembershipModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingMembership ? 'Update' : 'Create'} Membership
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Custom Charge Modal */}
      <Modal
        isOpen={isChargeModalOpen}
        onClose={() => setIsChargeModalOpen(false)}
        title="Add Custom Charge"
      >
        <form onSubmit={handleChargeSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="charge_family">Family *</Label>
            <select
              id="charge_family"
              value={chargeForm.family_id}
              onChange={(e) => setChargeForm({ ...chargeForm, family_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            >
              <option value="">Select a family</option>
              {families.map((family) => (
                <option key={family.id} value={family.id}>{family.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="charge_description">Description *</Label>
            <Input
              id="charge_description"
              value={chargeForm.description}
              onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
              placeholder="e.g., Tournament fee, Equipment, Belt test"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="charge_amount">Amount (USD) *</Label>
              <Input
                id="charge_amount"
                type="number"
                step="0.01"
                min="0"
                value={chargeForm.amount}
                onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })}
                placeholder="25.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="charge_due_date">Due Date</Label>
              <Input
                id="charge_due_date"
                type="date"
                value={chargeForm.due_date}
                onChange={(e) => setChargeForm({ ...chargeForm, due_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsChargeModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create Charge
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
