'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Modal } from '@/components/ui/modal'
import { Users, User, Mail, ChevronDown, ChevronUp, Plus, UserPlus, X, Search } from 'lucide-react'
import toast from 'react-hot-toast'

interface FamilyMember {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  role: string
  family_id: string | null
}

interface Family {
  id: string
  name: string
  billing_email: string | null
  primary_holder_id: string
  primary_holder: {
    id: string
    full_name: string
    email: string
    avatar_url: string | null
  } | null
  members: FamilyMember[]
}

export default function FamiliesPage() {
  const [families, setFamilies] = useState<Family[]>([])
  const [allMembers, setAllMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set())

  // Create family modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newFamilyName, setNewFamilyName] = useState('')
  const [selectedPrimaryHolder, setSelectedPrimaryHolder] = useState<FamilyMember | null>(null)
  const [primaryHolderSearchTerm, setPrimaryHolderSearchTerm] = useState('')
  const [showPrimaryHolderDropdown, setShowPrimaryHolderDropdown] = useState(false)
  const primaryHolderSearchRef = useRef<HTMLDivElement>(null)
  const [selectedMembers, setSelectedMembers] = useState<FamilyMember[]>([])
  const [billingEmail, setBillingEmail] = useState('')
  const [memberSearchTerm, setMemberSearchTerm] = useState('')
  const [showMemberDropdown, setShowMemberDropdown] = useState(false)
  const memberSearchRef = useRef<HTMLDivElement>(null)

  // Add members modal state
  const [showAddMembersModal, setShowAddMembersModal] = useState(false)
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null)
  const [membersToAdd, setMembersToAdd] = useState<FamilyMember[]>([])
  const [isAddingMembers, setIsAddingMembers] = useState(false)
  const [addMemberSearchTerm, setAddMemberSearchTerm] = useState('')
  const [showAddMemberDropdown, setShowAddMemberDropdown] = useState(false)
  const addMemberSearchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchData()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (primaryHolderSearchRef.current && !primaryHolderSearchRef.current.contains(event.target as Node)) {
        setShowPrimaryHolderDropdown(false)
      }
      if (memberSearchRef.current && !memberSearchRef.current.contains(event.target as Node)) {
        setShowMemberDropdown(false)
      }
      if (addMemberSearchRef.current && !addMemberSearchRef.current.contains(event.target as Node)) {
        setShowAddMemberDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchData = async () => {
    const supabase = createClient()
    const { data: profile } = await supabase.auth.getUser()

    if (!profile.user) return

    const { data: userProfileData } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', profile.user.id)
      .single()

    const userProfile = userProfileData as { school_id: string | null } | null
    if (!userProfile?.school_id) {
      setLoading(false)
      return
    }

    // Get all approved members
    const { data: membersData } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, role, family_id')
      .eq('school_id', userProfile.school_id)
      .eq('is_approved', true)
      .in('role', ['student', 'parent'])
      .order('full_name')

    const typedMembersData = (membersData || []) as FamilyMember[]
    if (membersData) {
      setAllMembers(typedMembersData)
    }

    // Get families
    const { data: familiesData } = await supabase
      .from('families')
      .select('id, name, billing_email, primary_holder_id')
      .eq('school_id', userProfile.school_id)
      .order('name')

    if (familiesData) {
      const typedFamiliesData = familiesData as { id: string; name: string; billing_email: string | null; primary_holder_id: string }[]
      const holderIds = typedFamiliesData.map(f => f.primary_holder_id).filter(Boolean)
      const { data: holdersData } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', holderIds.length > 0 ? holderIds : ['none'])

      const typedHoldersData = (holdersData || []) as { id: string; full_name: string; email: string; avatar_url: string | null }[]
      const familiesWithMembers = typedFamiliesData.map(family => ({
        ...family,
        primary_holder: typedHoldersData.find(h => h.id === family.primary_holder_id) || null,
        members: typedMembersData.filter(m => m.family_id === family.id)
      }))

      setFamilies(familiesWithMembers as Family[])
    }
    setLoading(false)
  }

  const toggleExpanded = (familyId: string) => {
    setExpandedFamilies(prev => {
      const newSet = new Set(prev)
      if (newSet.has(familyId)) {
        newSet.delete(familyId)
      } else {
        newSet.add(familyId)
      }
      return newSet
    })
  }

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFamilyName.trim()) {
      toast.error('Please enter a family name')
      return
    }

    if (!selectedPrimaryHolder) {
      toast.error('Please select a primary holder')
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFamilyName,
          primary_holder_id: selectedPrimaryHolder.id,
          billing_email: billingEmail || null,
          member_ids: selectedMembers.map(m => m.id),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create family')
      }

      toast.success('Family created successfully')
      setShowCreateModal(false)
      resetCreateForm()
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create family')
    } finally {
      setIsCreating(false)
    }
  }

  const resetCreateForm = () => {
    setNewFamilyName('')
    setSelectedPrimaryHolder(null)
    setPrimaryHolderSearchTerm('')
    setShowPrimaryHolderDropdown(false)
    setSelectedMembers([])
    setBillingEmail('')
    setMemberSearchTerm('')
    setShowMemberDropdown(false)
  }

  const openAddMembersModal = (family: Family, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedFamily(family)
    setMembersToAdd([])
    setShowAddMembersModal(true)
  }

  const handleAddMembers = async () => {
    if (!selectedFamily || membersToAdd.length === 0) return

    setIsAddingMembers(true)
    try {
      // Update each member's family_id
      for (const member of membersToAdd) {
        await fetch(`/api/students/${member.id}/family`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ family_id: selectedFamily.id }),
        })
      }

      toast.success('Members added to family')
      setShowAddMembersModal(false)
      setSelectedFamily(null)
      setMembersToAdd([])
      setAddMemberSearchTerm('')
      setShowAddMemberDropdown(false)
      fetchData()
    } catch (error) {
      toast.error('Failed to add members')
    } finally {
      setIsAddingMembers(false)
    }
  }

  // Add member to selected list
  const addMemberToSelection = (member: FamilyMember) => {
    if (!selectedMembers.find(m => m.id === member.id)) {
      setSelectedMembers([...selectedMembers, member])
    }
    setMemberSearchTerm('')
    setShowMemberDropdown(false)
  }

  // Remove member from selected list
  const removeMemberFromSelection = (memberId: string) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== memberId))
  }

  // Add member to "add members" list
  const addMemberToAddList = (member: FamilyMember) => {
    if (!membersToAdd.find(m => m.id === member.id)) {
      setMembersToAdd([...membersToAdd, member])
    }
    setAddMemberSearchTerm('')
    setShowAddMemberDropdown(false)
  }

  // Remove member from "add members" list
  const removeMemberFromAddList = (memberId: string) => {
    setMembersToAdd(membersToAdd.filter(m => m.id !== memberId))
  }

  // Members without a family (for adding to families)
  const unassignedMembers = allMembers.filter(m => !m.family_id)

  // Filter members for primary holder search (parents and students can be primary holders)
  const filteredMembersForPrimaryHolder = allMembers.filter(m =>
    (m.full_name?.toLowerCase().includes(primaryHolderSearchTerm.toLowerCase()) ||
     m.email?.toLowerCase().includes(primaryHolderSearchTerm.toLowerCase()))
  ).slice(0, 10)

  // Filter members for search in create modal (exclude already selected)
  const filteredMembersForCreate = allMembers.filter(m =>
    !selectedMembers.find(s => s.id === m.id) &&
    (m.full_name?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
     m.email?.toLowerCase().includes(memberSearchTerm.toLowerCase()))
  ).slice(0, 10)

  // Filter members for search in add members modal (exclude already selected and those in families)
  const filteredMembersForAdd = unassignedMembers.filter(m =>
    !membersToAdd.find(s => s.id === m.id) &&
    (m.full_name?.toLowerCase().includes(addMemberSearchTerm.toLowerCase()) ||
     m.email?.toLowerCase().includes(addMemberSearchTerm.toLowerCase()))
  ).slice(0, 10)

  const filteredFamilies = families.filter(family =>
    family.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    family.primary_holder?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    family.members.some(m => m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return <div className="p-4 md:p-8 text-gray-900 dark:text-white">Loading families...</div>
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Families</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Manage family groups at your school</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Create Family
        </Button>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search families..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-sm"
        />
      </div>

      {filteredFamilies.length === 0 ? (
        <Card>
          <CardContent className="p-6 md:p-8 text-center text-gray-500 dark:text-gray-400">
            <Users className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Families Yet</h3>
            <p className="text-sm md:text-base">Create a family to group parents and their children together.</p>
            <Button className="mt-4 w-full sm:w-auto" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Family
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFamilies.map((family) => {
            const isExpanded = expandedFamilies.has(family.id)
            const memberCount = family.members.length

            return (
              <Card key={family.id} className="overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors touch-manipulation"
                  onClick={() => toggleExpanded(family.id)}
                >
                  {/* Mobile Layout */}
                  <div className="md:hidden">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center flex-shrink-0">
                        <Users className="h-5 w-5 text-red-600 dark:text-red-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold truncate text-gray-900 dark:text-white">{family.name}</h3>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="secondary" className="text-xs">
                              {memberCount}
                            </Badge>
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                        {family.primary_holder && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {family.primary_holder.full_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => openAddMembersModal(family, e)}
                        className="flex-1"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add Members
                      </Button>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                        <Users className="h-6 w-6 text-red-600 dark:text-red-300" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{family.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          {family.primary_holder && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {family.primary_holder.full_name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {family.billing_email || family.primary_holder?.email || 'No email'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => openAddMembersModal(family, e)}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add Members
                      </Button>
                      <Badge variant="secondary">
                        {memberCount} {memberCount === 1 ? 'member' : 'members'}
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 md:p-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Family Members</h4>
                    {family.members.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        No members assigned yet. Tap "Add Members" to add students to this family.
                      </p>
                    ) : (
                      <div className="space-y-2 md:space-y-0 md:grid md:gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {family.members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700"
                          >
                            <Avatar
                              src={member.avatar_url}
                              name={member.full_name}
                              size="sm"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate text-gray-900 dark:text-white">{member.full_name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate md:block hidden">{member.email}</p>
                            </div>
                            <Badge variant="outline" className="capitalize text-xs flex-shrink-0">
                              {member.role}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Family Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          resetCreateForm()
        }}
        title="Create Family"
      >
        <form onSubmit={handleCreateFamily} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="familyName">Family Name *</Label>
            <Input
              id="familyName"
              placeholder="e.g., Smith Family"
              value={newFamilyName}
              onChange={(e) => setNewFamilyName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Primary Holder *</Label>

            {/* Selected primary holder as chip */}
            {selectedPrimaryHolder && (
              <div className="flex flex-wrap gap-2 mb-2">
                <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-sm">
                  <span>{selectedPrimaryHolder.full_name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPrimaryHolder(null)}
                    className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Search input with dropdown */}
            {!selectedPrimaryHolder && (
              <div ref={primaryHolderSearchRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or email..."
                    value={primaryHolderSearchTerm}
                    onChange={(e) => {
                      setPrimaryHolderSearchTerm(e.target.value)
                      setShowPrimaryHolderDropdown(true)
                    }}
                    onFocus={() => setShowPrimaryHolderDropdown(true)}
                    className="pl-9"
                  />
                </div>

                {/* Dropdown results */}
                {showPrimaryHolderDropdown && primaryHolderSearchTerm && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredMembersForPrimaryHolder.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 p-3">No members found</p>
                    ) : (
                      filteredMembersForPrimaryHolder.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => {
                            setSelectedPrimaryHolder(member)
                            setPrimaryHolderSearchTerm('')
                            setShowPrimaryHolderDropdown(false)
                          }}
                          className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                        >
                          <Avatar src={member.avatar_url} name={member.full_name} size="sm" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{member.full_name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                          </div>
                          <Badge variant="outline" className="capitalize text-xs">
                            {member.role}
                          </Badge>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">The primary holder is the main account holder responsible for billing.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="billingEmail">Billing Email</Label>
            <Input
              id="billingEmail"
              type="email"
              placeholder="billing@example.com"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Add Members (Students/Children)</Label>

            {/* Selected members as chips */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded-full text-sm"
                  >
                    <span>{member.full_name}</span>
                    <button
                      type="button"
                      onClick={() => removeMemberFromSelection(member.id)}
                      className="hover:bg-red-200 dark:hover:bg-red-800 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search input with dropdown */}
            <div ref={memberSearchRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search members by name or email..."
                  value={memberSearchTerm}
                  onChange={(e) => {
                    setMemberSearchTerm(e.target.value)
                    setShowMemberDropdown(true)
                  }}
                  onFocus={() => setShowMemberDropdown(true)}
                  className="pl-9"
                />
              </div>

              {/* Dropdown results */}
              {showMemberDropdown && memberSearchTerm && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredMembersForCreate.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 p-3">No members found</p>
                  ) : (
                    filteredMembersForCreate.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => addMemberToSelection(member)}
                        className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                      >
                        <Avatar src={member.avatar_url} name={member.full_name} size="sm" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{member.full_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                        </div>
                        <Badge variant="outline" className="capitalize text-xs">
                          {member.role}
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selectedMembers.length} member(s) selected
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateModal(false)
                resetCreateForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Create Family
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Members Modal */}
      <Modal
        isOpen={showAddMembersModal}
        onClose={() => {
          setShowAddMembersModal(false)
          setSelectedFamily(null)
          setMembersToAdd([])
          setAddMemberSearchTerm('')
          setShowAddMemberDropdown(false)
        }}
        title={`Add Members to ${selectedFamily?.name || 'Family'}`}
      >
        <div className="space-y-4">
          {unassignedMembers.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">
              All members are already assigned to families.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Search and select members to add to this family:
              </p>

              {/* Selected members as chips */}
              {membersToAdd.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {membersToAdd.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded-full text-sm"
                    >
                      <span>{member.full_name}</span>
                      <button
                        type="button"
                        onClick={() => removeMemberFromAddList(member.id)}
                        className="hover:bg-red-200 dark:hover:bg-red-800 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Search input with dropdown */}
              <div ref={addMemberSearchRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search members by name or email..."
                    value={addMemberSearchTerm}
                    onChange={(e) => {
                      setAddMemberSearchTerm(e.target.value)
                      setShowAddMemberDropdown(true)
                    }}
                    onFocus={() => setShowAddMemberDropdown(true)}
                    className="pl-9"
                  />
                </div>

                {/* Dropdown results */}
                {showAddMemberDropdown && addMemberSearchTerm && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredMembersForAdd.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 p-3">No unassigned members found</p>
                    ) : (
                      filteredMembersForAdd.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => addMemberToAddList(member)}
                          className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                        >
                          <Avatar src={member.avatar_url} name={member.full_name} size="sm" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{member.full_name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                          </div>
                          <Badge variant="outline" className="capitalize text-xs">
                            {member.role}
                          </Badge>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {membersToAdd.length} member(s) selected | {unassignedMembers.length} unassigned member(s) available
              </p>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddMembersModal(false)
                setSelectedFamily(null)
                setMembersToAdd([])
                setAddMemberSearchTerm('')
                setShowAddMemberDropdown(false)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMembers}
              disabled={membersToAdd.length === 0}
              isLoading={isAddingMembers}
            >
              Add to Family
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
