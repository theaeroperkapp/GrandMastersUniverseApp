'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Award, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface BeltRank {
  id: string
  name: string
  color: string
}

interface BeltTestFee {
  id: string
  fee: number
  description: string | null
  is_active: boolean
  from_belt: BeltRank | null
  to_belt: BeltRank | null
}

interface BeltTestFeesProps {
  schoolId: string
}

export function BeltTestFees({ schoolId }: BeltTestFeesProps) {
  const [fees, setFees] = useState<BeltTestFee[]>([])
  const [belts, setBelts] = useState<BeltRank[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFee, setEditingFee] = useState<BeltTestFee | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [form, setForm] = useState({
    from_belt_id: '',
    to_belt_id: '',
    fee: '',
    description: '',
  })

  useEffect(() => {
    fetchData()
  }, [schoolId])

  const fetchData = async () => {
    try {
      // Fetch belt test fees
      const feesRes = await fetch('/api/belt-tests')
      const feesData = await feesRes.json()
      if (feesData.fees) {
        setFees(feesData.fees)
      }

      // Fetch belts for the school
      const beltsRes = await fetch(`/api/belts?school_id=${schoolId}`)
      const beltsData = await beltsRes.json()
      if (beltsData.belts) {
        setBelts(beltsData.belts)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingFee(null)
    setForm({
      from_belt_id: '',
      to_belt_id: '',
      fee: '',
      description: '',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (fee: BeltTestFee) => {
    setEditingFee(fee)
    setForm({
      from_belt_id: fee.from_belt?.id || '',
      to_belt_id: fee.to_belt?.id || '',
      fee: (fee.fee / 100).toString(),
      description: fee.description || '',
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const feeInCents = Math.round(parseFloat(form.fee) * 100)

      if (editingFee) {
        // Update existing fee
        const response = await fetch(`/api/belt-tests/${editingFee.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from_belt_id: form.from_belt_id || null,
            to_belt_id: form.to_belt_id || null,
            fee: feeInCents,
            description: form.description || null,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to update fee')
        }

        toast.success('Belt test fee updated')
      } else {
        // Create new fee
        const response = await fetch('/api/belt-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from_belt_id: form.from_belt_id || null,
            to_belt_id: form.to_belt_id || null,
            fee: feeInCents,
            description: form.description || null,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to create fee')
        }

        toast.success('Belt test fee created')
      }

      setIsModalOpen(false)
      fetchData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save fee'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this belt test fee?')) return

    try {
      const response = await fetch(`/api/belt-tests/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete fee')
      }

      toast.success('Belt test fee deleted')
      fetchData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete fee'
      toast.error(message)
    }
  }

  const toggleActive = async (fee: BeltTestFee) => {
    try {
      const response = await fetch(`/api/belt-tests/${fee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !fee.is_active }),
      })

      if (!response.ok) {
        throw new Error('Failed to update fee')
      }

      toast.success(fee.is_active ? 'Fee deactivated' : 'Fee activated')
      fetchData()
    } catch {
      toast.error('Failed to update fee')
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  const getBeltColor = (color: string) => {
    const colors: Record<string, string> = {
      white: 'bg-gray-100 text-gray-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      orange: 'bg-orange-100 text-orange-800',
      green: 'bg-green-100 text-green-800',
      blue: 'bg-blue-100 text-blue-800',
      purple: 'bg-purple-100 text-purple-800',
      brown: 'bg-amber-100 text-amber-800',
      red: 'bg-red-100 text-red-800',
      black: 'bg-gray-900 text-white',
    }
    return colors[color.toLowerCase()] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Belt Test Fees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Belt Test Fees
              </CardTitle>
              <CardDescription>Configure fees for belt promotions</CardDescription>
            </div>
            <Button size="sm" onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-1" />
              Add Fee
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {fees.length === 0 ? (
            <div className="text-center py-8">
              <Award className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p className="text-gray-500 mb-4">No belt test fees configured yet.</p>
              <Button variant="outline" size="sm" onClick={openCreateModal}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Fee
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {fees.map((fee) => (
                <div
                  key={fee.id}
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    !fee.is_active ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {fee.from_belt ? (
                        <Badge className={getBeltColor(fee.from_belt.color)}>
                          {fee.from_belt.name}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Any</Badge>
                      )}
                      <span className="text-gray-400">→</span>
                      {fee.to_belt ? (
                        <Badge className={getBeltColor(fee.to_belt.color)}>
                          {fee.to_belt.name}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Any</Badge>
                      )}
                    </div>
                    {fee.description && (
                      <span className="text-sm text-gray-500">{fee.description}</span>
                    )}
                    {!fee.is_active && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatCurrency(fee.fee)}</span>
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(fee)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(fee)}
                      className="text-xs"
                    >
                      {fee.is_active ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(fee.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFee ? 'Edit Belt Test Fee' : 'Add Belt Test Fee'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from_belt">From Belt</Label>
              <select
                id="from_belt"
                value={form.from_belt_id}
                onChange={(e) => setForm({ ...form, from_belt_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Any Belt</option>
                {belts.map((belt) => (
                  <option key={belt.id} value={belt.id}>
                    {belt.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="to_belt">To Belt</Label>
              <select
                id="to_belt"
                value={form.to_belt_id}
                onChange={(e) => setForm({ ...form, to_belt_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Any Belt</option>
                {belts.map((belt) => (
                  <option key={belt.id} value={belt.id}>
                    {belt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fee">Fee (USD) *</Label>
            <Input
              id="fee"
              type="number"
              step="0.01"
              min="0"
              value={form.fee}
              onChange={(e) => setForm({ ...form, fee: e.target.value })}
              placeholder="50.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g., Includes certificate and new belt"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>{editingFee ? 'Update' : 'Create'} Fee</>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
