'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Plus, Edit, Trash2, UserPlus, Mail, Shield, Users } from 'lucide-react'
import toast from 'react-hot-toast'

interface StaffMember {
  id: string
  full_name: string
  email: string
  role: string
  sub_roles: string[]
  is_approved: boolean
  created_at: string
}

const STAFF_ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full access to school management' },
  { value: 'instructor', label: 'Instructor', description: 'Can manage classes and students' },
]

const ALL_ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full access to school management' },
  { value: 'instructor', label: 'Instructor', description: 'Can manage classes and students' },
  { value: 'student', label: 'Student', description: 'Regular student member' },
  { value: 'parent', label: 'Parent', description: 'Parent/guardian of students' },
]

const SUB_ROLES = [
  { value: 'community_manager', label: 'Community Manager', description: 'Manage posts and announcements' },
  { value: 'billing_coordinator', label: 'Billing Coordinator', description: 'Manage billing and payments' },
  { value: 'event_coordinator', label: 'Event Coordinator', description: 'Manage events and registrations' },
]

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Invite modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    full_name: '',
    role: 'instructor',
    sub_roles: [] as string[],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [editForm, setEditForm] = useState({
    role: '',
    sub_roles: [] as string[],
  })

  // Promote member modal state
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false)
  const [members, setMembers] = useState<StaffMember[]>([])
  const [selectedMember, setSelectedMember] = useState<string>('')
  const [promoteForm, setPromoteForm] = useState({
    role: 'instructor',
    sub_roles: [] as string[],
  })

  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    const supabase = createClient()
    const { data: profile } = await supabase.auth.getUser()

    if (!profile.user) return

    setCurrentUserId(profile.user.id)

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

    // Fetch all staff members (owners, admins, instructors)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, sub_roles, is_approved, created_at')
      .eq('school_id', userProfile.school_id)
      .in('role', ['owner', 'admin', 'instructor'])
      .order('created_at', { ascending: false })

    if (data) {
      setStaff(data)
    }
    setLoading(false)
  }

  const openInviteModal = () => {
    setInviteForm({
      email: '',
      full_name: '',
      role: 'instructor',
      sub_roles: [],
    })
    setIsInviteModalOpen(true)
  }

  const openPromoteModal = async () => {
    if (!schoolId) return

    const supabase = createClient()

    // Fetch students and parents who could be promoted
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, sub_roles, is_approved, created_at')
      .eq('school_id', schoolId)
      .in('role', ['student', 'parent'])
      .eq('is_approved', true)
      .order('full_name')

    if (data) {
      setMembers(data)
    }
    setSelectedMember('')
    setPromoteForm({ role: 'instructor', sub_roles: [] })
    setIsPromoteModalOpen(true)
  }

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMember) {
      toast.error('Please select a member to promote')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/staff/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: selectedMember,
          role: promoteForm.role,
          sub_roles: promoteForm.sub_roles,
          school_id: schoolId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to promote member')
      }

      toast.success('Member promoted to staff successfully!')
      setIsPromoteModalOpen(false)
      fetchStaff()
    } catch (error) {
      console.error('Error promoting member:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to promote member')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schoolId) return

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/staff/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteForm.email,
          full_name: inviteForm.full_name,
          role: inviteForm.role,
          sub_roles: inviteForm.sub_roles,
          school_id: schoolId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invite')
      }

      toast.success('Staff invitation sent successfully!')
      setIsInviteModalOpen(false)
      fetchStaff()
    } catch (error) {
      console.error('Error sending invite:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send invite')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditModal = (member: StaffMember) => {
    setEditingStaff(member)
    setEditForm({
      role: member.role,
      sub_roles: member.sub_roles || [],
    })
    setIsEditModalOpen(true)
  }

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStaff) return

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/staff/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: editingStaff.id,
          role: editForm.role,
          sub_roles: editForm.sub_roles,
          action: 'update',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update staff member')
      }

      toast.success('Staff member updated successfully')
      setIsEditModalOpen(false)
      fetchStaff()
    } catch (error) {
      console.error('Error updating staff:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update staff member')
    } finally {
      setIsSubmitting(false)
    }
  }

  const removeStaff = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this staff member? They will lose access to staff features.')) return

    try {
      const response = await fetch('/api/staff/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          action: 'remove',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove staff member')
      }

      toast.success('Staff member removed')
      fetchStaff()
    } catch (error) {
      console.error('Error removing staff:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to remove staff member')
    }
  }

  const toggleSubRole = (role: string, isEdit = false) => {
    if (isEdit) {
      const currentRoles = editForm.sub_roles
      if (currentRoles.includes(role)) {
        setEditForm({ ...editForm, sub_roles: currentRoles.filter(r => r !== role) })
      } else {
        setEditForm({ ...editForm, sub_roles: [...currentRoles, role] })
      }
    } else {
      const currentRoles = inviteForm.sub_roles
      if (currentRoles.includes(role)) {
        setInviteForm({ ...inviteForm, sub_roles: currentRoles.filter(r => r !== role) })
      } else {
        setInviteForm({ ...inviteForm, sub_roles: [...currentRoles, role] })
      }
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800'
      case 'admin':
        return 'bg-blue-100 text-blue-800'
      case 'instructor':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredStaff = staff.filter(member =>
    member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="p-8">Loading staff...</div>
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Staff</h1>
          <p className="text-gray-600">Manage your school's staff members</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openPromoteModal}>
            <Users className="h-4 w-4 mr-2" />
            Promote Member
          </Button>
          <Button onClick={openInviteModal}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite New Staff
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search staff..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filteredStaff.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No staff members found. Invite staff members to help manage your school.</p>
            <Button onClick={openInviteModal}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite First Staff Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStaff.map((member) => (
            <Card key={member.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{member.full_name || 'No Name'}</CardTitle>
                  {member.id !== currentUserId && member.role !== 'owner' && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(member)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeStaff(member.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-3">{member.email}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge className={getRoleBadgeColor(member.role)}>
                    {member.role}
                  </Badge>
                  {member.sub_roles?.map((subRole) => (
                    <Badge key={subRole} variant="outline">
                      {subRole.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
                {!member.is_approved && (
                  <p className="text-xs text-amber-600 mt-2">Pending approval</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Staff Roles & Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <h3 className="font-medium text-purple-800">Owner</h3>
              <p className="text-sm text-purple-600">Full access to all school features including subscription management</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-800">Admin</h3>
              <p className="text-sm text-blue-600">Full access to school management except subscription settings</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-800">Instructor</h3>
              <p className="text-sm text-green-600">Can manage classes, students, and belt progressions</p>
            </div>
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Additional Permissions (Sub-roles)</h4>
              <div className="grid gap-2 sm:grid-cols-3">
                {SUB_ROLES.map((role) => (
                  <div key={role.value} className="p-2 bg-gray-50 rounded">
                    <p className="font-medium text-sm">{role.label}</p>
                    <p className="text-xs text-gray-500">{role.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invite Staff Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Staff Member"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite_email">Email Address *</Label>
            <Input
              id="invite_email"
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              placeholder="staff@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite_name">Full Name *</Label>
            <Input
              id="invite_name"
              value={inviteForm.full_name}
              onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite_role">Role *</Label>
            <select
              id="invite_role"
              value={inviteForm.role}
              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {STAFF_ROLES.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Additional Permissions</Label>
            <div className="space-y-2">
              {SUB_ROLES.map((role) => (
                <label key={role.value} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inviteForm.sub_roles.includes(role.value)}
                    onChange={() => toggleSubRole(role.value)}
                    className="rounded"
                  />
                  <div>
                    <span className="font-medium text-sm">{role.label}</span>
                    <p className="text-xs text-gray-500">{role.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              <Mail className="h-4 w-4 mr-2" />
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit ${editingStaff?.full_name}`}
      >
        <form onSubmit={handleUpdateRole} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit_role">Role *</Label>
            <select
              id="edit_role"
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {ALL_ROLES.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
            {(editForm.role === 'student' || editForm.role === 'parent') && (
              <p className="text-sm text-amber-600 mt-1">
                Changing to {editForm.role} will remove staff access.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Additional Permissions</Label>
            <div className="space-y-2">
              {SUB_ROLES.map((role) => (
                <label key={role.value} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.sub_roles.includes(role.value)}
                    onChange={() => toggleSubRole(role.value, true)}
                    className="rounded"
                  />
                  <div>
                    <span className="font-medium text-sm">{role.label}</span>
                    <p className="text-xs text-gray-500">{role.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Update Staff Member
            </Button>
          </div>
        </form>
      </Modal>

      {/* Promote Member Modal */}
      <Modal
        isOpen={isPromoteModalOpen}
        onClose={() => setIsPromoteModalOpen(false)}
        title="Promote Member to Staff"
      >
        <form onSubmit={handlePromote} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="select_member">Select Member *</Label>
            {members.length === 0 ? (
              <p className="text-sm text-gray-500 p-3 bg-gray-50 rounded">
                No students or parents available to promote.
              </p>
            ) : (
              <select
                id="select_member"
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              >
                <option value="">Choose a member...</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} ({member.email}) - {member.role}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="promote_role">New Role *</Label>
            <select
              id="promote_role"
              value={promoteForm.role}
              onChange={(e) => setPromoteForm({ ...promoteForm, role: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {STAFF_ROLES.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Additional Permissions</Label>
            <div className="space-y-2">
              {SUB_ROLES.map((role) => (
                <label key={role.value} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={promoteForm.sub_roles.includes(role.value)}
                    onChange={() => {
                      const current = promoteForm.sub_roles
                      if (current.includes(role.value)) {
                        setPromoteForm({ ...promoteForm, sub_roles: current.filter(r => r !== role.value) })
                      } else {
                        setPromoteForm({ ...promoteForm, sub_roles: [...current, role.value] })
                      }
                    }}
                    className="rounded"
                  />
                  <div>
                    <span className="font-medium text-sm">{role.label}</span>
                    <p className="text-xs text-gray-500">{role.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsPromoteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} disabled={!selectedMember || members.length === 0}>
              Promote to Staff
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
