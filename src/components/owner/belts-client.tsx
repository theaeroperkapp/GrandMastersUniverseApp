'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Plus, Trash2, GripVertical, Info, Loader2, ChevronDown, ChevronRight, Clock, Users, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

interface BeltRank {
  id: string
  name: string
  color: string
  display_order: number
  is_default: boolean
  stripe_count?: number
  stripe_color?: string
  parent_belt_id?: string | null
}

interface ClassSchedule {
  id: string
  name: string
  description: string | null
  day_of_week: number
  start_time: string
  end_time: string
  max_capacity: number | null
  belt_requirement_id: string | null
  is_active: boolean
  instructor: { id: string; full_name: string } | null
}

interface Instructor {
  id: string
  full_name: string
}

interface BeltsClientProps {
  defaultBelts: BeltRank[]
  customBelts: BeltRank[]
  schoolId: string
  disabledBelts: string[]
  classes: ClassSchedule[]
  instructors: Instructor[]
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Belt visual component with stripe support
function BeltVisual({ color, stripeCount = 0, stripeColor = '#000000', size = 'md' }: {
  color: string
  stripeCount?: number
  stripeColor?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  const stripeWidths = { sm: 2, md: 2, lg: 3 }
  const stripeGaps = { sm: 3, md: 4, lg: 5 }

  const stripeWidth = stripeWidths[size]
  const stripeGap = stripeGaps[size]
  const totalWidth = stripeCount * stripeWidth + (stripeCount - 1) * stripeGap
  const startOffset = -totalWidth / 2 + stripeWidth / 2

  return (
    <div
      className={`${sizeClasses[size]} rounded-full border-2 border-gray-300 relative overflow-hidden flex-shrink-0`}
      style={{ backgroundColor: color }}
    >
      {stripeCount > 0 && (
        <>
          {Array.from({ length: Math.min(stripeCount, 4) }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0"
              style={{
                backgroundColor: stripeColor,
                width: `${stripeWidth}px`,
                left: '50%',
                marginLeft: `${startOffset + i * (stripeWidth + stripeGap)}px`,
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}

export function BeltsClient({ defaultBelts, customBelts, schoolId, classes: initialClasses, instructors }: BeltsClientProps) {
  // Combine all belts into a single list, sorted by display_order
  const initialBelts = [...customBelts].sort((a, b) => a.display_order - b.display_order)

  const [belts, setBelts] = useState<BeltRank[]>(initialBelts)
  const [classes, setClasses] = useState<ClassSchedule[]>(initialClasses)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isClassModalOpen, setIsClassModalOpen] = useState(false)
  const [expandedBelts, setExpandedBelts] = useState<Set<string>>(new Set())
  const [selectedBeltForClass, setSelectedBeltForClass] = useState<string | null>(null)
  const [newBelt, setNewBelt] = useState({
    name: '',
    color: '#0000FF',
    stripe_count: 0,
    stripe_color: '#000000',
    parent_belt_id: '',
  })
  const [newClass, setNewClass] = useState({
    name: '',
    description: '',
    day_of_week: 1,
    start_time: '09:00',
    end_time: '10:00',
    max_capacity: 20,
    instructor_id: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isClassLoading, setIsClassLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragCounter = useRef(0)

  // Get classes for a specific belt (including child belts)
  const getClassesForBelt = (beltId: string) => {
    // Get this belt and any child belts (belts that have this as parent)
    const childBeltIds = belts.filter(b => b.parent_belt_id === beltId).map(b => b.id)
    const relevantBeltIds = [beltId, ...childBeltIds]
    return classes.filter(c => c.belt_requirement_id && relevantBeltIds.includes(c.belt_requirement_id))
  }

  // Toggle belt expansion
  const toggleBeltExpansion = (beltId: string) => {
    setExpandedBelts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(beltId)) {
        newSet.delete(beltId)
      } else {
        newSet.add(beltId)
      }
      return newSet
    })
  }

  // Open class modal for a specific belt
  const openClassModal = (beltId: string) => {
    setSelectedBeltForClass(beltId)
    setNewClass({
      name: '',
      description: '',
      day_of_week: 1,
      start_time: '09:00',
      end_time: '10:00',
      max_capacity: 20,
      instructor_id: '',
    })
    setIsClassModalOpen(true)
  }

  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${ampm}`
  }

  // Initialize belts from defaults if school has no belts
  useEffect(() => {
    if (belts.length === 0 && defaultBelts.length > 0) {
      initializeBelts()
    }
  }, [])

  const initializeBelts = async () => {
    setIsInitializing(true)
    try {
      const response = await fetch('/api/belts/initialize', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.initialized && data.belts) {
          setBelts(data.belts.sort((a: BeltRank, b: BeltRank) => a.display_order - b.display_order))
          toast.success('Belt ranks initialized from defaults')
        }
      }
    } catch (error) {
      console.error('Failed to initialize belts:', error)
    } finally {
      setIsInitializing(false)
    }
  }

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
          display_order: belts.length + 1,
          stripe_count: newBelt.stripe_count,
          stripe_color: newBelt.stripe_color,
          parent_belt_id: newBelt.parent_belt_id || null,
        }),
      })

      if (!response.ok) throw new Error()

      const belt = await response.json()
      setBelts([...belts, belt])
      setNewBelt({ name: '', color: '#0000FF', stripe_count: 0, stripe_color: '#000000', parent_belt_id: '' })
      setIsModalOpen(false)
      toast.success('Belt rank added')
    } catch {
      toast.error('Failed to add belt rank')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteBelt = async (beltId: string) => {
    if (!confirm('Are you sure you want to delete this belt rank? Students with this belt will need to be reassigned.')) return

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

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBeltForClass) return

    setIsClassLoading(true)
    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          name: newClass.name,
          description: newClass.description || null,
          day_of_week: newClass.day_of_week,
          start_time: newClass.start_time,
          end_time: newClass.end_time,
          max_capacity: newClass.max_capacity,
          instructor_id: newClass.instructor_id || null,
          belt_requirement_id: selectedBeltForClass,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add class')
      }

      const classData = await response.json()
      // Add instructor info to the class
      const instructor = instructors.find(i => i.id === newClass.instructor_id)
      setClasses([...classes, { ...classData, instructor: instructor ? { id: instructor.id, full_name: instructor.full_name } : null }])
      setIsClassModalOpen(false)
      setExpandedBelts(prev => new Set([...prev, selectedBeltForClass]))
      toast.success('Class added')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add class')
    } finally {
      setIsClassLoading(false)
    }
  }

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return

    try {
      const response = await fetch(`/api/classes/${classId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error()

      setClasses(classes.filter(c => c.id !== classId))
      toast.success('Class deleted')
    } catch {
      toast.error('Failed to delete class')
    }
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', '')
  }

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    dragCounter.current++
    if (draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = () => {
    dragCounter.current--
    if (dragCounter.current === 0) {
      setDragOverIndex(null)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    dragCounter.current = 0
    setDragOverIndex(null)

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      return
    }

    const newBelts = [...belts]
    const [draggedBelt] = newBelts.splice(draggedIndex, 1)
    newBelts.splice(dropIndex, 0, draggedBelt)

    // Update display_order for all belts
    const updatedBelts = newBelts.map((belt, index) => ({
      ...belt,
      display_order: index + 1,
    }))

    setBelts(updatedBelts)
    setDraggedIndex(null)

    // Save new order to server
    try {
      const response = await fetch('/api/belts/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beltIds: updatedBelts.map(b => b.id),
        }),
      })

      if (!response.ok) throw new Error()
      toast.success('Belt order updated')
    } catch {
      toast.error('Failed to save belt order')
      // Revert on error
      setBelts(belts)
    }
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
    dragCounter.current = 0
  }

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Setting up belt ranks...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Manage your school&apos;s belt ranks</p>
              <p className="mt-1">
                Drag and drop to reorder belts. Add custom belts with your own names, colors, and stripes.
                The order here determines the progression path for your students.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Belt List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Belt Progression</CardTitle>
            <CardDescription>
              {belts.length} belt{belts.length !== 1 ? 's' : ''} in your school&apos;s progression
            </CardDescription>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Belt
          </Button>
        </CardHeader>
        <CardContent>
          {belts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No belt ranks yet. Add your first belt to get started!</p>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add First Belt
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {belts.map((belt, index) => {
                const beltClasses = getClassesForBelt(belt.id)
                const isExpanded = expandedBelts.has(belt.id)

                return (
                  <div key={belt.id} className="border-2 rounded-lg border-gray-200 overflow-hidden">
                    {/* Belt Header Row */}
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragEnter={(e) => handleDragEnter(e, index)}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`
                        flex items-center gap-3 p-3 transition-all cursor-move bg-white
                        ${draggedIndex === index ? 'opacity-50' : ''}
                        ${dragOverIndex === index ? 'bg-red-50' : ''}
                        hover:bg-gray-50
                      `}
                    >
                      <div className="flex items-center gap-2 text-gray-400">
                        <GripVertical className="h-5 w-5" />
                        <span className="text-sm font-medium w-6">{index + 1}</span>
                      </div>

                      <BeltVisual
                        color={belt.color}
                        stripeCount={belt.stripe_count}
                        stripeColor={belt.stripe_color}
                      />

                      <span className="font-medium flex-1">{belt.name}</span>

                      {/* Classes count badge */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleBeltExpansion(belt.id)
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        title={`${beltClasses.length} class${beltClasses.length !== 1 ? 'es' : ''}`}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{beltClasses.length}</span>
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteBelt(belt.id)
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete belt"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Expanded Classes Section */}
                    {isExpanded && (
                      <div className="bg-gray-50 border-t border-gray-200 p-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700">Classes for {belt.name}</span>
                          <Button size="sm" variant="outline" onClick={() => openClassModal(belt.id)}>
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add Class
                          </Button>
                        </div>

                        {beltClasses.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">
                            No classes scheduled for this belt level yet.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {beltClasses.map((cls) => (
                              <div
                                key={cls.id}
                                className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="text-sm">
                                    <span className="font-medium">{DAYS_OF_WEEK[cls.day_of_week]}</span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{cls.name}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                                      </span>
                                      {cls.max_capacity && (
                                        <span className="flex items-center gap-1">
                                          <Users className="h-3 w-3" />
                                          Max {cls.max_capacity}
                                        </span>
                                      )}
                                      {cls.instructor && (
                                        <span>{cls.instructor.full_name}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDeleteClass(cls.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                                  title="Delete class"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Belt Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Belt Rank"
      >
        <form onSubmit={handleAddBelt} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Belt Name</Label>
            <Input
              id="name"
              placeholder="e.g., Blue Belt, Yellow Belt 1st Stripe"
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
                className="w-16 h-12 rounded border cursor-pointer"
              />
              <Input
                value={newBelt.color}
                onChange={(e) => setNewBelt({ ...newBelt, color: e.target.value })}
                placeholder="#0000FF"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Number of Stripes</Label>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setNewBelt({ ...newBelt, stripe_count: count })}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    newBelt.stripe_count === count
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {count === 0 ? 'None' : count}
                </button>
              ))}
            </div>
          </div>

          {newBelt.stripe_count > 0 && (
            <div className="space-y-2">
              <Label htmlFor="stripe_color">Stripe Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="stripe_color"
                  value={newBelt.stripe_color}
                  onChange={(e) => setNewBelt({ ...newBelt, stripe_color: e.target.value })}
                  className="w-16 h-12 rounded border cursor-pointer"
                />
                <Input
                  value={newBelt.stripe_color}
                  onChange={(e) => setNewBelt({ ...newBelt, stripe_color: e.target.value })}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="parent_belt">Parent Belt (Optional)</Label>
            <select
              id="parent_belt"
              value={newBelt.parent_belt_id}
              onChange={(e) => setNewBelt({ ...newBelt, parent_belt_id: e.target.value })}
              className="w-full h-10 px-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">No parent belt (standalone)</option>
              {belts.filter(b => !b.parent_belt_id).map((belt) => (
                <option key={belt.id} value={belt.id}>
                  {belt.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              Link stripe variations to their base belt. Students with this belt will see classes assigned to the parent.
            </p>
          </div>

          {/* Preview */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-2">Preview</p>
            <div className="flex items-center gap-3">
              <BeltVisual
                color={newBelt.color}
                stripeCount={newBelt.stripe_count}
                stripeColor={newBelt.stripe_color}
                size="lg"
              />
              <span className="font-medium">{newBelt.name || 'Belt Name'}</span>
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

      {/* Add Class Modal */}
      <Modal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        title={`Add Class for ${belts.find(b => b.id === selectedBeltForClass)?.name || 'Belt'}`}
      >
        <form onSubmit={handleAddClass} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="class_name">Class Name *</Label>
            <Input
              id="class_name"
              placeholder="e.g., Beginner Class, Sparring Practice"
              value={newClass.name}
              onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="class_description">Description</Label>
            <Input
              id="class_description"
              placeholder="Optional description"
              value={newClass.description}
              onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="day_of_week">Day of Week *</Label>
              <select
                id="day_of_week"
                value={newClass.day_of_week}
                onChange={(e) => setNewClass({ ...newClass, day_of_week: parseInt(e.target.value) })}
                className="w-full h-10 px-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              >
                {DAYS_OF_WEEK.map((day, index) => (
                  <option key={index} value={index}>{day}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_capacity">Max Capacity</Label>
              <Input
                id="max_capacity"
                type="number"
                min="1"
                value={newClass.max_capacity}
                onChange={(e) => setNewClass({ ...newClass, max_capacity: parseInt(e.target.value) || 20 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="time"
                value={newClass.start_time}
                onChange={(e) => setNewClass({ ...newClass, start_time: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <Input
                id="end_time"
                type="time"
                value={newClass.end_time}
                onChange={(e) => setNewClass({ ...newClass, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructor_id">Instructor</Label>
            <select
              id="instructor_id"
              value={newClass.instructor_id}
              onChange={(e) => setNewClass({ ...newClass, instructor_id: e.target.value })}
              className="w-full h-10 px-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">No instructor assigned</option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>{instructor.full_name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsClassModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isClassLoading}>
              Add Class
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
