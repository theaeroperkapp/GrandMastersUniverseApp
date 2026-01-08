'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Clock, Users, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

interface ClassSchedule {
  id: string
  school_id: string
  name: string
  description: string | null
  day_of_week: number
  start_time: string
  end_time: string
  instructor_id: string | null
  max_capacity: number | null
  belt_requirement_id: string | null
  is_active: boolean
  created_at: string
}

interface Instructor {
  id: string
  full_name: string
  avatar_url: string | null
}

interface ClassesClientProps {
  initialClasses: ClassSchedule[]
  instructors: Instructor[]
  schoolId: string
}

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
]

export function ClassesClient({ initialClasses, instructors, schoolId }: ClassesClientProps) {
  const [classes, setClasses] = useState(initialClasses)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<ClassSchedule | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    day_of_week: 1,
    start_time: '09:00',
    end_time: '10:00',
    instructor_id: '',
    max_capacity: '',
  })

  const openCreateModal = () => {
    setEditingClass(null)
    setFormData({
      name: '', description: '', day_of_week: 1, start_time: '09:00',
      end_time: '10:00', instructor_id: '', max_capacity: '',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (cls: ClassSchedule) => {
    setEditingClass(cls)
    setFormData({
      name: cls.name,
      description: cls.description || '',
      day_of_week: cls.day_of_week,
      start_time: cls.start_time.slice(0, 5),
      end_time: cls.end_time.slice(0, 5),
      instructor_id: cls.instructor_id || '',
      max_capacity: cls.max_capacity?.toString() || '',
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const payload = {
        school_id: schoolId,
        name: formData.name,
        description: formData.description || null,
        day_of_week: formData.day_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
        instructor_id: formData.instructor_id || null,
        max_capacity: formData.max_capacity ? parseInt(formData.max_capacity) : null,
      }

      const url = editingClass ? `/api/classes/${editingClass.id}` : '/api/classes'
      const response = await fetch(url, {
        method: editingClass ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save class')
      }

      const savedClass = await response.json()

      if (editingClass) {
        setClasses(classes.map(c => c.id === savedClass.id ? savedClass : c))
        toast.success('Class updated successfully')
      } else {
        setClasses([...classes, savedClass])
        toast.success('Class created successfully')
      }

      setIsModalOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return

    try {
      const response = await fetch(`/api/classes/${classId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete class')

      setClasses(classes.filter(c => c.id !== classId))
      toast.success('Class deleted successfully')
      router.refresh()
    } catch {
      toast.error('Failed to delete class')
    }
  }

  const toggleActive = async (cls: ClassSchedule) => {
    try {
      const response = await fetch(`/api/classes/${cls.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !cls.is_active }),
      })

      if (!response.ok) throw new Error('Failed to update class')

      const updatedClass = await response.json()
      setClasses(classes.map(c => c.id === updatedClass.id ? updatedClass : c))
      toast.success(updatedClass.is_active ? 'Class activated' : 'Class deactivated')
    } catch {
      toast.error('Failed to update class')
    }
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const classesByDay = DAYS_OF_WEEK.map((day, index) => ({
    day,
    classes: classes.filter(c => c.day_of_week === index),
  }))

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Class
        </Button>
      </div>

      <div className="grid gap-4">
        {classesByDay.map(({ day, classes: dayClasses }) => (
          dayClasses.length > 0 && (
            <Card key={day}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {day}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dayClasses.map(cls => {
                    const instructor = instructors.find(i => i.id === cls.instructor_id)
                    return (
                      <div key={cls.id} className={`p-4 rounded-lg border ${cls.is_active ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{cls.name}</h3>
                              {!cls.is_active && <Badge variant="secondary">Inactive</Badge>}
                            </div>
                            {cls.description && <p className="text-sm text-gray-500 mb-2">{cls.description}</p>}
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                              </span>
                              {cls.max_capacity && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  Max {cls.max_capacity}
                                </span>
                              )}
                              {instructor && <span>Instructor: {instructor.full_name}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => toggleActive(cls)}>
                              {cls.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(cls)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(cls.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        ))}

        {classes.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">No classes scheduled yet</p>
              <Button onClick={openCreateModal}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Class
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingClass ? 'Edit Class' : 'Add New Class'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Class Name *</Label>
            <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Kids Karate" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="day_of_week">Day of Week *</Label>
              <select id="day_of_week" value={formData.day_of_week} onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" required>
                {DAYS_OF_WEEK.map((day, index) => (<option key={day} value={index}>{day}</option>))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructor_id">Instructor</Label>
              <select id="instructor_id" value={formData.instructor_id} onChange={(e) => setFormData({ ...formData, instructor_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="">Select instructor</option>
                {instructors.map(i => (<option key={i.id} value={i.id}>{i.full_name}</option>))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input id="start_time" type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <Input id="end_time" type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_capacity">Max Capacity</Label>
            <Input id="max_capacity" type="number" min="1" value={formData.max_capacity} onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })} placeholder="e.g., 20" />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isLoading}>{editingClass ? 'Update Class' : 'Create Class'}</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
