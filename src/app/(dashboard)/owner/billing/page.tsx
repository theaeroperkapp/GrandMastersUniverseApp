'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Edit, Trash2, DollarSign, Users, GraduationCap, UserCheck, Award, ChevronDown, Check } from 'lucide-react'
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
  family_id: string | null
  profile_id: string | null
  family?: {
    name: string
  } | null
  profile?: {
    full_name: string
  } | null
}

interface Family {
  id: string
  name: string
}

interface Profile {
  id: string
  full_name: string
  is_student: boolean
  account_type: string
  family_id: string | null
  role: string
  student_profile?: {
    belt_rank_id: string | null
  } | null
  family_member?: {
    is_student: boolean
  } | null
}

interface BeltRank {
  id: string
  name: string
  color: string
  display_order: number
}

type RecipientFilter = 'all' | 'students' | 'parents' | 'belts'

interface Recipient {
  id: string
  name: string
  type: 'family' | 'profile'
  beltId?: string | null
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
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [beltRanks, setBeltRanks] = useState<BeltRank[]>([])
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
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>('all')
  const [selectedBeltFilter, setSelectedBeltFilter] = useState<string>('')
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([])
  const [showBeltDropdown, setShowBeltDropdown] = useState(false)
  const [chargeForm, setChargeForm] = useState({
    description: '',
    amount: '',
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

    // Fetch memberships, charges, families, profiles, and belt ranks
    const [membershipsRes, chargesRes, familiesRes, profilesRes, beltsRes] = await Promise.all([
      fetch('/api/memberships').then(res => res.json()),
      fetch('/api/custom-charges').then(res => res.json()),
      supabase
        .from('families')
        .select('id, name')
        .eq('school_id', userProfile.school_id)
        .order('name'),
      supabase
        .from('profiles')
        .select('id, full_name, is_student, account_type, family_id, role, student_profiles(belt_rank_id), family_members(is_student)')
        .eq('school_id', userProfile.school_id)
        .eq('is_approved', true)
        .neq('role', 'owner')
        .order('full_name'),
      supabase
        .from('belt_ranks')
        .select('id, name, color, display_order')
        .or(`school_id.eq.${userProfile.school_id},is_default.eq.true`)
        .order('display_order'),
    ])

    if (Array.isArray(membershipsRes)) setMemberships(membershipsRes)
    if (Array.isArray(chargesRes)) setCharges(chargesRes as CustomCharge[])
    if (familiesRes.data) setFamilies(familiesRes.data)
    if (profilesRes.data) {
      // Transform the data to match our interface
      const transformedProfiles = profilesRes.data.map((p: Record<string, unknown>) => ({
        ...p,
        student_profile: Array.isArray(p.student_profiles) ? p.student_profiles[0] : p.student_profiles,
        family_member: Array.isArray(p.family_members) ? p.family_members[0] : p.family_members,
      })) as Profile[]
      setProfiles(transformedProfiles)
    }
    if (beltsRes.data) setBeltRanks(beltsRes.data)
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

    try {
      const priceInCents = Math.round(parseFloat(membershipForm.price) * 100)

      if (editingMembership) {
        const response = await fetch(`/api/memberships/${editingMembership.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: membershipForm.name,
            description: membershipForm.description || null,
            price: priceInCents,
            billing_period: membershipForm.billing_period,
            family_discount_percent: parseFloat(membershipForm.family_discount_percent) || 0,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to update membership')
        }
        toast.success('Membership updated successfully')
      } else {
        const response = await fetch('/api/memberships', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: membershipForm.name,
            description: membershipForm.description || null,
            price: priceInCents,
            billing_period: membershipForm.billing_period,
            family_discount_percent: parseFloat(membershipForm.family_discount_percent) || 0,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to create membership')
        }
        toast.success('Membership created successfully')
      }

      setIsMembershipModalOpen(false)
      fetchBillingData()
    } catch (error) {
      console.error('Error saving membership:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save membership')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleMembershipActive = async (membership: Membership) => {
    try {
      const response = await fetch(`/api/memberships/${membership.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !membership.is_active }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update membership')
      }

      toast.success(membership.is_active ? 'Membership deactivated' : 'Membership activated')
      fetchBillingData()
    } catch (error) {
      console.error('Error toggling membership:', error)
      toast.error('Failed to update membership')
    }
  }

  const deleteMembership = async (id: string) => {
    if (!confirm('Are you sure you want to delete this membership plan?')) return

    try {
      const response = await fetch(`/api/memberships/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete membership')
      }

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
      due_date: '',
    })
    setRecipientFilter('all')
    setSelectedBeltFilter('')
    setSelectedRecipients([])
    setShowBeltDropdown(false)
    setIsChargeModalOpen(true)
  }

  // Get filtered recipients based on current filter
  const getFilteredRecipients = (): Recipient[] => {
    // Helper to check if profile is a student
    // Check: role is 'student', is_student flag, has student_profile, or family_member.is_student
    const isStudent = (p: Profile) =>
      p.role === 'student' ||
      p.is_student ||
      !!p.student_profile ||
      p.family_member?.is_student

    switch (recipientFilter) {
      case 'students':
        return profiles
          .filter(p => isStudent(p))
          .map(p => ({ id: p.id, name: p.full_name, type: 'profile' as const, beltId: p.student_profile?.belt_rank_id }))
      case 'parents':
        return profiles
          .filter(p => p.account_type === 'adult' && !isStudent(p))
          .map(p => ({ id: p.id, name: p.full_name, type: 'profile' as const }))
      case 'belts':
        // Filter students by selected belt
        if (selectedBeltFilter) {
          return profiles
            .filter(p => isStudent(p) && p.student_profile?.belt_rank_id === selectedBeltFilter)
            .map(p => ({ id: p.id, name: p.full_name, type: 'profile' as const, beltId: p.student_profile?.belt_rank_id }))
        }
        // Show all students if no belt selected
        return profiles
          .filter(p => isStudent(p))
          .map(p => ({ id: p.id, name: p.full_name, type: 'profile' as const, beltId: p.student_profile?.belt_rank_id }))
      case 'all':
      default:
        // Show families and all profiles
        const familyRecipients: Recipient[] = families.map(f => ({ id: f.id, name: f.name, type: 'family' as const }))
        const profileRecipients: Recipient[] = profiles.map(p => ({ id: p.id, name: p.full_name, type: 'profile' as const, beltId: p.student_profile?.belt_rank_id }))
        return [...familyRecipients, ...profileRecipients]
    }
  }

  const toggleRecipient = (recipient: Recipient) => {
    setSelectedRecipients(prev => {
      const exists = prev.find(r => r.id === recipient.id && r.type === recipient.type)
      if (exists) {
        return prev.filter(r => !(r.id === recipient.id && r.type === recipient.type))
      }
      return [...prev, recipient]
    })
  }

  const selectAllRecipients = () => {
    const filtered = getFilteredRecipients()
    setSelectedRecipients(filtered)
  }

  const clearRecipients = () => {
    setSelectedRecipients([])
  }

  const isRecipientSelected = (recipient: Recipient) => {
    return selectedRecipients.some(r => r.id === recipient.id && r.type === recipient.type)
  }

  const handleChargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schoolId || selectedRecipients.length === 0) {
      toast.error('Please select at least one recipient')
      return
    }

    setIsSubmitting(true)

    try {
      const amountInCents = Math.round(parseFloat(chargeForm.amount) * 100)

      const response = await fetch('/api/custom-charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: selectedRecipients.map(r => ({
            id: r.id,
            type: r.type,
          })),
          description: chargeForm.description,
          amount: amountInCents,
          due_date: chargeForm.due_date || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create charges')
      }

      const data = await response.json()
      toast.success(`Created ${data.count || selectedRecipients.length} charge(s)`)
      setIsChargeModalOpen(false)
      fetchBillingData()
    } catch (error) {
      console.error('Error creating charges:', error)
      toast.error('Failed to create charges')
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
    return <div className="p-4 md:p-8 text-gray-900 dark:text-white">Loading billing...</div>
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Billing</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Manage membership plans and charges</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={openCreateMembershipModal} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Membership
          </Button>
          <Button onClick={openChargeModal} className="w-full sm:w-auto">
            <DollarSign className="h-4 w-4 mr-2" />
            Add Charge
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Membership Plans</CardTitle>
            <CardDescription>Configure your tuition plans</CardDescription>
          </CardHeader>
          <CardContent>
            {memberships.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No membership plans created yet.</p>
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
                    className={`p-4 border dark:border-gray-700 rounded-lg ${!membership.is_active ? 'opacity-60' : ''}`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">{membership.name}</h3>
                          {!membership.is_active && (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatCurrency(membership.price)}/{membership.billing_period}
                        </p>
                        {membership.family_discount_percent > 0 && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            {membership.family_discount_percent}% family discount
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t dark:border-gray-700">
                      <Button variant="outline" size="sm" onClick={() => toggleMembershipActive(membership)} className="flex-1 touch-manipulation text-xs">
                        {membership.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditMembershipModal(membership)} className="h-9 w-9 p-0 touch-manipulation">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteMembership(membership.id)} className="h-9 w-9 p-0 touch-manipulation">
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
                <p className="text-gray-500 dark:text-gray-400 mb-4">No custom charges yet.</p>
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
                    className="flex justify-between items-center p-4 border dark:border-gray-700 rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{charge.description}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {charge.family?.name || charge.profile?.full_name || 'Unknown'}
                        {charge.family_id && <span className="text-xs ml-1">(Family)</span>}
                      </p>
                      {charge.due_date && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Due: {new Date(charge.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(charge.amount)}</p>
                        <Badge
                          variant={charge.status === 'paid' ? 'default' : 'secondary'}
                          className={charge.status === 'paid' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : ''}
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
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                className="w-full h-11 min-h-[44px] px-3 py-2 border dark:border-gray-700 rounded-lg text-base touch-manipulation focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
            <p className="text-xs text-gray-500 dark:text-gray-400">Discount applied to additional family members</p>
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
          {/* Recipient Filter Tabs */}
          <div className="space-y-2">
            <Label>Select Recipients</Label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setRecipientFilter('all'); setSelectedBeltFilter(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  recipientFilter === 'all'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Users className="h-4 w-4" />
                All
              </button>
              <button
                type="button"
                onClick={() => { setRecipientFilter('students'); setSelectedBeltFilter(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  recipientFilter === 'students'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                Students
              </button>
              <button
                type="button"
                onClick={() => { setRecipientFilter('parents'); setSelectedBeltFilter(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  recipientFilter === 'parents'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <UserCheck className="h-4 w-4" />
                Parents
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setRecipientFilter('belts'); setShowBeltDropdown(!showBeltDropdown); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    recipientFilter === 'belts'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Award className="h-4 w-4" />
                  Belts
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showBeltDropdown && recipientFilter === 'belts' && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-10 py-1">
                    <button
                      type="button"
                      onClick={() => { setSelectedBeltFilter(''); setShowBeltDropdown(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        !selectedBeltFilter ? 'bg-gray-100 dark:bg-gray-700' : ''
                      }`}
                    >
                      All Belts
                    </button>
                    {beltRanks.map((belt) => (
                      <button
                        key={belt.id}
                        type="button"
                        onClick={() => { setSelectedBeltFilter(belt.id); setShowBeltDropdown(false); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                          selectedBeltFilter === belt.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: belt.color }}
                        />
                        {belt.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {selectedBeltFilter && recipientFilter === 'belts' && (
              <p className="text-xs text-gray-500">
                Filtered by: {beltRanks.find(b => b.id === selectedBeltFilter)?.name}
              </p>
            )}
          </div>

          {/* Recipient List with Multi-select */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>
                Recipients ({selectedRecipients.length} selected)
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllRecipients}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={clearRecipients}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto border dark:border-gray-700 rounded-lg">
              {getFilteredRecipients().length === 0 ? (
                <p className="text-center py-4 text-sm text-gray-500">No recipients found</p>
              ) : (
                getFilteredRecipients().map((recipient) => {
                  const beltInfo = recipient.beltId ? beltRanks.find(b => b.id === recipient.beltId) : null
                  return (
                    <label
                      key={`${recipient.type}-${recipient.id}`}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-700 last:border-b-0 ${
                        isRecipientSelected(recipient) ? 'bg-red-50 dark:bg-red-900/20' : ''
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isRecipientSelected(recipient)
                            ? 'bg-red-600 border-red-600'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                        onClick={() => toggleRecipient(recipient)}
                      >
                        {isRecipientSelected(recipient) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-900 dark:text-white truncate block">
                          {recipient.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {recipient.type === 'family' ? 'Family' : 'Individual'}
                          {beltInfo && (
                            <span className="ml-2 inline-flex items-center gap-1">
                              <span
                                className="w-2 h-2 rounded-full inline-block"
                                style={{ backgroundColor: beltInfo.color }}
                              />
                              {beltInfo.name}
                            </span>
                          )}
                        </span>
                      </div>
                    </label>
                  )
                })
              )}
            </div>
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
            <Button type="submit" isLoading={isSubmitting} disabled={selectedRecipients.length === 0}>
              Create {selectedRecipients.length > 1 ? `${selectedRecipients.length} Charges` : 'Charge'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
