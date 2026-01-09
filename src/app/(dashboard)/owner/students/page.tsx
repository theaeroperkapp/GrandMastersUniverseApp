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
import { User, QrCode, Key, Download, Printer, Award, Users, Plus, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'

interface BeltRank {
  id: string
  name: string
  color: string
  display_order: number
}

interface Family {
  id: string
  name: string
  primary_holder_id: string
  membership?: {
    id: string
    membership_id: string
    status: string
    membership: { id: string; name: string } | null
  } | null
}

interface Membership {
  id: string
  name: string
  price: number
  billing_period: string
}

interface Member {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  role: string
  family_id: string | null
  is_approved: boolean
  created_at: string
  student_profile?: {
    id: string
    pin_code?: string | null
    belt_rank_id?: string | null
    belt_rank: {
      id: string
      name: string
      color: string
    } | null
    enrollment_date: string | null
  } | null
  profile_membership?: {
    id: string
    membership_id: string
    status: string
    membership: { id: string; name: string } | null
  } | null
}

export default function StudentsPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [belts, setBelts] = useState<BeltRank[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [showQrModal, setShowQrModal] = useState(false)
  const [memberPin, setMemberPin] = useState<string | null>(null)
  const [generatingPin, setGeneratingPin] = useState(false)
  const [updatingBelt, setUpdatingBelt] = useState(false)
  const [updatingFamily, setUpdatingFamily] = useState(false)
  const [updatingSubscription, setUpdatingSubscription] = useState(false)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const qrRef = useRef<HTMLDivElement>(null)

  // Add student modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [addingStudent, setAddingStudent] = useState(false)
  const [newStudent, setNewStudent] = useState({
    full_name: '',
    email: '',
    role: 'student' as 'student' | 'parent',
    belt_rank_id: '',
    family_id: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()
    const { data: authData } = await supabase.auth.getUser()

    if (!authData.user) return

    const { data: userProfileData } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', authData.user.id)
      .single()

    const userProfile = userProfileData as { school_id: string | null } | null
    if (!userProfile?.school_id) {
      setLoading(false)
      return
    }

    setSchoolId(userProfile.school_id)

    // Fetch all data in parallel
    await Promise.all([
      fetchMembers(supabase, userProfile.school_id),
      fetchBelts(supabase, userProfile.school_id),
      fetchFamilies(supabase, userProfile.school_id),
      fetchMemberships(),
    ])

    setLoading(false)
  }

  const fetchMembers = async (supabase: ReturnType<typeof createClient>, schoolId: string) => {
    // Get all approved members (students and parents) from profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, role, family_id, is_approved, created_at')
      .eq('school_id', schoolId)
      .eq('is_approved', true)
      .in('role', ['student', 'parent'])
      .order('created_at', { ascending: false })

    if (profilesData) {
      type ProfileRow = { id: string; full_name: string; email: string; avatar_url: string | null; role: string; family_id: string | null; is_approved: boolean; created_at: string }
      const typedProfilesData = profilesData as ProfileRow[]

      // Get student_profiles data for these members
      const memberIds = typedProfilesData.map(p => p.id)
      const { data: studentProfilesData } = await supabase
        .from('student_profiles')
        .select('id, profile_id, enrollment_date, pin_code, belt_rank_id, belt_rank:belt_ranks(id, name, color)')
        .in('profile_id', memberIds)

      type StudentProfileRow = { id: string; profile_id: string; enrollment_date: string | null; pin_code: string | null; belt_rank_id: string | null; belt_rank: { id: string; name: string; color: string } | null }
      const typedStudentProfilesData = (studentProfilesData || []) as StudentProfileRow[]

      // Get profile_memberships data for these members (table might not exist yet)
      let typedProfileMembershipsData: { id: string; profile_id: string; membership_id: string; status: string; membership: { id: string; name: string } | null }[] = []
      try {
        const { data: profileMembershipsData } = await supabase
          .from('profile_memberships')
          .select('id, profile_id, membership_id, status, membership:memberships(id, name)')
          .in('profile_id', memberIds)

        type ProfileMembershipRow = { id: string; profile_id: string; membership_id: string; status: string; membership: { id: string; name: string } | null }
        typedProfileMembershipsData = (profileMembershipsData || []) as ProfileMembershipRow[]
      } catch {
        // Table might not exist yet, ignore error
        console.log('profile_memberships table not found, skipping')
      }

      // Merge the data
      const membersWithDetails = typedProfilesData.map(profile => ({
        ...profile,
        student_profile: typedStudentProfilesData.find(sp => sp.profile_id === profile.id) || null,
        profile_membership: typedProfileMembershipsData.find(pm => pm.profile_id === profile.id) || null
      }))

      setMembers(membersWithDetails as Member[])
    }
  }

  const fetchBelts = async (supabase: ReturnType<typeof createClient>, schoolId: string) => {
    // Only fetch school-specific belts (not defaults)
    const { data: beltsData } = await supabase
      .from('belt_ranks')
      .select('*')
      .eq('school_id', schoolId)
      .order('display_order')

    if (beltsData) {
      setBelts(beltsData)
    }
  }

  const fetchFamilies = async (supabase: ReturnType<typeof createClient>, schoolId: string) => {
    const { data: familiesData } = await supabase
      .from('families')
      .select('id, name, primary_holder_id, membership:family_memberships(id, membership_id, status, membership:memberships(id, name))')
      .eq('school_id', schoolId)
      .order('name')

    if (familiesData) {
      // family_memberships returns an array, take the first one
      type FamilyRow = {
        id: string
        name: string
        primary_holder_id: string
        membership: Array<{ id: string; membership_id: string; status: string; membership: { id: string; name: string } | null }> | null
      }
      const typedFamilies = (familiesData as FamilyRow[]).map(f => ({
        ...f,
        membership: f.membership?.[0] || null
      }))
      setFamilies(typedFamilies)
    }
  }

  const fetchMemberships = async () => {
    try {
      const response = await fetch('/api/memberships')
      const data = await response.json()
      if (Array.isArray(data)) {
        // Filter to only active memberships
        const activeMemberships = data.filter((m: Membership & { is_active?: boolean }) => m.is_active !== false)
        setMemberships(activeMemberships)
      }
    } catch (error) {
      console.error('Error fetching memberships:', error)
    }
  }

  const openQrModal = async (member: Member) => {
    setSelectedMember(member)
    setMemberPin(member.student_profile?.pin_code || null)
    setShowQrModal(true)

    // Fetch latest PIN if exists
    try {
      const response = await fetch(`/api/students/${member.id}/pin`)
      if (response.ok) {
        const data = await response.json()
        setMemberPin(data.pin)
      }
    } catch (error) {
      console.error('Error fetching PIN:', error)
    }
  }

  const generatePin = async () => {
    if (!selectedMember) return

    setGeneratingPin(true)
    try {
      const response = await fetch(`/api/students/${selectedMember.id}/pin`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate PIN')
      }

      setMemberPin(data.pin)

      if (data.alreadyExists) {
        toast.success('PIN already exists for this student')
      } else {
        toast.success('PIN generated successfully')
      }

      // Update the member in the list
      setMembers(prev => prev.map(m => {
        if (m.id === selectedMember.id) {
          return {
            ...m,
            student_profile: {
              ...m.student_profile,
              id: data.studentProfileId,
              pin_code: data.pin,
              belt_rank_id: m.student_profile?.belt_rank_id || null,
              belt_rank: m.student_profile?.belt_rank || null,
              enrollment_date: m.student_profile?.enrollment_date || null,
            }
          }
        }
        return m
      }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate PIN')
    } finally {
      setGeneratingPin(false)
    }
  }

  const updateBeltRank = async (beltId: string | null) => {
    if (!selectedMember || !schoolId) return

    setUpdatingBelt(true)
    try {
      // First ensure student_profile exists
      let studentProfileId = selectedMember.student_profile?.id

      if (!studentProfileId) {
        // Create student profile first
        const pinResponse = await fetch(`/api/students/${selectedMember.id}/pin`, {
          method: 'POST',
        })
        const pinData = await pinResponse.json()
        if (pinResponse.ok) {
          studentProfileId = pinData.studentProfileId
        }
      }

      if (!studentProfileId) {
        throw new Error('Could not create student profile')
      }

      // Update belt rank
      const response = await fetch(`/api/students/${selectedMember.id}/belt`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ belt_rank_id: beltId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update belt')
      }

      const selectedBelt = belts.find(b => b.id === beltId)

      // Update the member in the list
      setMembers(prev => prev.map(m => {
        if (m.id === selectedMember.id) {
          return {
            ...m,
            student_profile: {
              ...m.student_profile,
              id: studentProfileId!,
              belt_rank_id: beltId,
              belt_rank: selectedBelt ? { id: selectedBelt.id, name: selectedBelt.name, color: selectedBelt.color } : null,
              pin_code: m.student_profile?.pin_code || null,
              enrollment_date: m.student_profile?.enrollment_date || null,
            }
          }
        }
        return m
      }))

      // Update selected member
      setSelectedMember(prev => prev ? {
        ...prev,
        student_profile: {
          ...prev.student_profile,
          id: studentProfileId!,
          belt_rank_id: beltId,
          belt_rank: selectedBelt ? { id: selectedBelt.id, name: selectedBelt.name, color: selectedBelt.color } : null,
          pin_code: prev.student_profile?.pin_code || null,
          enrollment_date: prev.student_profile?.enrollment_date || null,
        }
      } : null)

      toast.success(beltId ? 'Belt rank updated' : 'Belt rank removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update belt')
    } finally {
      setUpdatingBelt(false)
    }
  }

  const updateFamily = async (familyId: string | null) => {
    if (!selectedMember) return

    setUpdatingFamily(true)
    try {
      const response = await fetch(`/api/students/${selectedMember.id}/family`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family_id: familyId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update family')
      }

      // Update the member in the list
      setMembers(prev => prev.map(m => {
        if (m.id === selectedMember.id) {
          return { ...m, family_id: familyId }
        }
        return m
      }))

      // Update selected member
      setSelectedMember(prev => prev ? { ...prev, family_id: familyId } : null)

      toast.success(familyId ? 'Family updated' : 'Removed from family')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update family')
    } finally {
      setUpdatingFamily(false)
    }
  }

  const updateSubscription = async (membershipId: string | null) => {
    if (!selectedMember) return

    setUpdatingSubscription(true)
    try {
      const response = await fetch(`/api/students/${selectedMember.id}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membership_id: membershipId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update subscription')
      }

      const data = await response.json()
      const selectedMembership = memberships.find(m => m.id === membershipId)

      // Update the member in the list
      setMembers(prev => prev.map(m => {
        if (m.id === selectedMember.id) {
          return {
            ...m,
            profile_membership: membershipId ? {
              id: data.id,
              membership_id: membershipId,
              status: 'active',
              membership: selectedMembership ? { id: selectedMembership.id, name: selectedMembership.name } : null
            } : null
          }
        }
        return m
      }))

      // Update selected member
      setSelectedMember(prev => prev ? {
        ...prev,
        profile_membership: membershipId ? {
          id: data.id,
          membership_id: membershipId,
          status: 'active',
          membership: selectedMembership ? { id: selectedMembership.id, name: selectedMembership.name } : null
        } : null
      } : null)

      toast.success(membershipId ? 'Subscription assigned' : 'Subscription removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update subscription')
    } finally {
      setUpdatingSubscription(false)
    }
  }

  const downloadQrCode = () => {
    if (!selectedMember) return

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${selectedMember.id}`
    const link = document.createElement('a')
    link.href = qrUrl
    link.download = `${selectedMember.full_name.replace(/\s+/g, '_')}_qr.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('QR code downloaded')
  }

  const printQrCode = () => {
    if (!selectedMember || !qrRef.current) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Please allow popups to print')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${selectedMember.full_name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .container {
              text-align: center;
              border: 2px solid #000;
              padding: 30px;
              border-radius: 10px;
            }
            h1 { margin: 0 0 10px; font-size: 24px; }
            p { margin: 5px 0; color: #666; }
            .qr-code { margin: 20px 0; }
            .pin {
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              margin: 20px 0;
              padding: 10px 20px;
              background: #f0f0f0;
              border-radius: 8px;
            }
            .label { font-size: 14px; color: #999; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${selectedMember.full_name}</h1>
            <p>Attendance Check-in Card</p>
            <div class="qr-code">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${selectedMember.id}" alt="QR Code" />
            </div>
            ${memberPin ? `
              <div class="label">PIN Code</div>
              <div class="pin">${memberPin}</div>
            ` : ''}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); }
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const getFamilyName = (familyId: string | null) => {
    if (!familyId) return null
    const family = families.find(f => f.id === familyId)
    return family?.name || null
  }

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStudent.full_name.trim() || !schoolId) {
      toast.error('Please enter a name')
      return
    }

    setAddingStudent(true)
    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newStudent,
          school_id: schoolId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add student')
      }

      toast.success('Student added successfully')
      setShowAddModal(false)
      setNewStudent({
        full_name: '',
        email: '',
        role: 'student',
        belt_rank_id: '',
        family_id: '',
      })

      // Refresh data
      const supabase = createClient()
      await fetchMembers(supabase, schoolId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add student')
    } finally {
      setAddingStudent(false)
    }
  }

  const filteredMembers = members.filter(member =>
    member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="p-4 md:p-8 text-gray-900 dark:text-white">Loading members...</div>
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Members</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Approved students and parents at your school</p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {members.length} members
          </div>
          <Button onClick={() => setShowAddModal(true)} className="flex-shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-sm"
        />
      </div>

      {filteredMembers.length === 0 ? (
        <Card>
          <CardContent className="p-6 md:p-8 text-center text-gray-500 dark:text-gray-400">
            <User className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Members Yet</h3>
            <p className="text-sm md:text-base">Members will appear here after they sign up with your school code and you approve them.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 md:space-y-0 md:grid md:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar
                    src={member.avatar_url}
                    name={member.full_name}
                    size="lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate text-gray-900 dark:text-white">{member.full_name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{member.email || 'No email'}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <Badge variant="secondary" className="capitalize text-xs">
                        {member.role}
                      </Badge>
                      {member.student_profile?.belt_rank && (
                        <Badge
                          className="text-xs"
                          style={{
                            backgroundColor: member.student_profile.belt_rank.color,
                            color: member.student_profile.belt_rank.color === '#FFFFFF' ? '#000' : '#fff'
                          }}
                        >
                          {member.student_profile.belt_rank.name}
                        </Badge>
                      )}
                      {getFamilyName(member.family_id) && (
                        <Badge variant="outline" className="text-xs">
                          {getFamilyName(member.family_id)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openQrModal(member)}
                    className="w-full sm:w-auto touch-manipulation"
                  >
                    <QrCode className="h-4 w-4 mr-1" />
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Student Management Modal */}
      <Modal
        isOpen={showQrModal}
        onClose={() => {
          setShowQrModal(false)
          setSelectedMember(null)
          setMemberPin(null)
        }}
        title="Member Management"
      >
        {selectedMember && (
          <div className="space-y-6" ref={qrRef}>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedMember.full_name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{selectedMember.email}</p>
              <Badge variant="secondary" className="capitalize mt-2">
                {selectedMember.role}
              </Badge>
            </div>

            {/* Family Assignment */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Family
              </Label>
              <select
                value={selectedMember.family_id || ''}
                onChange={(e) => updateFamily(e.target.value || null)}
                disabled={updatingFamily}
                className="w-full h-11 min-h-[44px] px-3 py-2 border dark:border-gray-700 rounded-lg text-base touch-manipulation focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">No family assigned</option>
                {families.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.name}
                  </option>
                ))}
              </select>
              {families.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Families are created when parents are approved
                </p>
              )}
            </div>

            {/* Belt Assignment (only for students) */}
            {selectedMember.role === 'student' && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Belt Rank
                </Label>
                <select
                  value={selectedMember.student_profile?.belt_rank_id || ''}
                  onChange={(e) => updateBeltRank(e.target.value || null)}
                  disabled={updatingBelt}
                  className="w-full h-11 min-h-[44px] px-3 py-2 border dark:border-gray-700 rounded-lg text-base touch-manipulation focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">No belt assigned</option>
                  {belts.map((belt) => (
                    <option key={belt.id} value={belt.id}>
                      {belt.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Subscription Assignment */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Subscription
              </Label>
              {/* Show family subscription info if member is in a family */}
              {selectedMember.family_id && families.find(f => f.id === selectedMember.family_id)?.membership ? (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        Via Family: {families.find(f => f.id === selectedMember.family_id)?.name}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {families.find(f => f.id === selectedMember.family_id)?.membership?.membership?.name} ({families.find(f => f.id === selectedMember.family_id)?.membership?.status})
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200">
                      Active
                    </Badge>
                  </div>
                </div>
              ) : (
                <>
                  {/* Individual subscription assignment */}
                  <select
                    value={selectedMember.profile_membership?.membership_id || ''}
                    onChange={(e) => updateSubscription(e.target.value || null)}
                    disabled={updatingSubscription}
                    className="w-full h-11 min-h-[44px] px-3 py-2 border dark:border-gray-700 rounded-lg text-base touch-manipulation focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">No subscription assigned</option>
                    {memberships.map((membership) => (
                      <option key={membership.id} value={membership.id}>
                        {membership.name} (${(membership.price / 100).toFixed(2)}/{membership.billing_period})
                      </option>
                    ))}
                  </select>
                  {memberships.length === 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      No memberships configured. Create memberships in Settings.
                    </p>
                  )}
                  {!selectedMember.family_id && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      This member is not in a family. Assign a subscription directly.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">QR Code for Check-in</p>
              <div className="p-4 bg-white dark:bg-gray-100 border dark:border-gray-300 rounded-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${selectedMember.id}`}
                  alt="QR Code"
                  className="w-48 h-48"
                />
              </div>
            </div>

            {/* PIN */}
            <div className="flex flex-col items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">PIN Code</p>
              {memberPin ? (
                <div className="text-4xl font-bold tracking-widest bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white px-6 py-3 rounded-lg">
                  {memberPin}
                </div>
              ) : (
                <>
                  <div className="text-gray-400 dark:text-gray-500 italic mb-3">No PIN assigned</div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={generatePin}
                    disabled={generatingPin}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    {generatingPin ? 'Generating...' : 'Generate PIN'}
                  </Button>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4 border-t">
              <Button variant="outline" onClick={downloadQrCode} className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Download QR
              </Button>
              <Button variant="outline" onClick={printQrCode} className="w-full sm:w-auto">
                <Printer className="h-4 w-4 mr-2" />
                Print Card
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Student Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setNewStudent({
            full_name: '',
            email: '',
            role: 'student',
            belt_rank_id: '',
            family_id: '',
          })
        }}
        title="Add Student"
      >
        <form onSubmit={handleAddStudent} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              value={newStudent.full_name}
              onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
              placeholder="Enter full name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={newStudent.email}
              onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
              placeholder="Enter email address"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              A welcome email will be sent to this address
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <select
              id="role"
              value={newStudent.role}
              onChange={(e) => setNewStudent({ ...newStudent, role: e.target.value as 'student' | 'parent' })}
              className="w-full h-11 min-h-[44px] px-3 py-2 border dark:border-gray-700 rounded-lg text-base touch-manipulation focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="student">Student</option>
              <option value="parent">Parent</option>
            </select>
          </div>

          {newStudent.role === 'student' && belts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="belt_rank_id">Belt Rank</Label>
              <select
                id="belt_rank_id"
                value={newStudent.belt_rank_id}
                onChange={(e) => setNewStudent({ ...newStudent, belt_rank_id: e.target.value })}
                className="w-full h-11 min-h-[44px] px-3 py-2 border dark:border-gray-700 rounded-lg text-base touch-manipulation focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">No belt assigned</option>
                {belts.map((belt) => (
                  <option key={belt.id} value={belt.id}>
                    {belt.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {families.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="family_id">Family</Label>
              <select
                id="family_id"
                value={newStudent.family_id}
                onChange={(e) => setNewStudent({ ...newStudent, family_id: e.target.value })}
                className="w-full h-11 min-h-[44px] px-3 py-2 border dark:border-gray-700 rounded-lg text-base touch-manipulation focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">No family assigned</option>
                {families.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddModal(false)
                setNewStudent({
                  full_name: '',
                  email: '',
                  role: 'student',
                  belt_rank_id: '',
                  family_id: '',
                })
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={addingStudent}>
              Add Student
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
