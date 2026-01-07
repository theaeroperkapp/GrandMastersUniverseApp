'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import toast from 'react-hot-toast'

interface BeltRank {
  id: string
  name: string
  color: string
  display_order: number
  is_default: boolean
}

interface BeltsClientProps {
  defaultBelts: BeltRank[]
  customBelts: BeltRank[]
  schoolId: string
}

export function BeltsClient({ defaultBelts, customBelts, schoolId }: BeltsClientProps) {
  const [belts, setBelts] = useState<BeltRank[]>(customBelts)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newBelt, setNewBelt] = useState({ name: '', color: '#000000' })
  const [isLoading, setIsLoading] = useState(false)

  const handleAddBelt = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/belts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          name: newBelt.name,
          color: newBelt.color,
          display_order: belts.length + defaultBelts.length + 1,
        }),
      })

      if (!response.ok) throw new Error()

      const belt = await response.json()
      setBelts([...belts, belt])
      setNewBelt({ name: '', color: '#000000' })
      setIsModalOpen(false)
      toast.success('Belt rank added')
    } catch {
      toast.error('Failed to add belt rank')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteBelt = async (beltId: string) => {
    if (!confirm('Are you sure you want to delete this belt rank?')) return

    try {
      const response = await fetch(`/api/belts/${beltId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error()

      setBelts(belts.filter((b) => b.id !== beltId))
      toast.success('Belt rank deleted')
    } catch {
      toast.error('Failed to delete belt rank')
    }
  }

  const BeltDisplay = ({ belt, showDelete = false }: { belt: BeltRank; showDelete?: boolean }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full border-2 border-gray-300"
          style={{ backgroundColor: belt.color }}
        />
        <span className="font-medium">{belt.name}</span>
      </div>
      {showDelete && (
        <button
          onClick={() => handleDeleteBelt(belt.id)}
          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Default Belts */}
      <Card>
        <CardHeader>
          <CardTitle>Default Belt Ranks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {defaultBelts.map((belt) => (
            <BeltDisplay key={belt.id} belt={belt} />
          ))}
        </CardContent>
      </Card>

      {/* Custom Belts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Custom Belt Ranks</CardTitle>
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Belt
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {belts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No custom belt ranks yet. Add your own!
            </p>
          ) : (
            belts.map((belt) => (
              <BeltDisplay key={belt.id} belt={belt} showDelete />
            ))
          )}
        </CardContent>
      </Card>

      {/* Add Belt Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Custom Belt Rank"
      >
        <form onSubmit={handleAddBelt} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Belt Name</Label>
            <Input
              id="name"
              placeholder="e.g., Red-Black Belt"
              value={newBelt.name}
              onChange={(e) => setNewBelt({ ...newBelt, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Belt Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="color"
                value={newBelt.color}
                onChange={(e) => setNewBelt({ ...newBelt, color: e.target.value })}
                className="w-12 h-10 rounded border cursor-pointer"
              />
              <Input
                value={newBelt.color}
                onChange={(e) => setNewBelt({ ...newBelt, color: e.target.value })}
                placeholder="#000000"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Add Belt
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
