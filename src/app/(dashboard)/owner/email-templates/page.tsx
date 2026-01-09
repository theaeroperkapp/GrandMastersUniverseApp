'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Mail,
  Plus,
  Send,
  Edit2,
  Trash2,
  Users,
  GraduationCap,
  UserCheck,
  Save,
  X,
  Award,
  ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  created_at: string
}

interface BeltRank {
  id: string
  name: string
  color: string
}

interface Recipient {
  id: string
  full_name: string
  email: string
  role: string
  belt_rank_id: string | null
  belt_rank_name: string | null
  belt_rank_color: string | null
}

export default function EmailTemplatesPage() {
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [belts, setBelts] = useState<BeltRank[]>([])
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [recipientFilter, setRecipientFilter] = useState<'all' | 'students' | 'parents'>('all')
  const [selectedBelts, setSelectedBelts] = useState<string[]>([])
  const [showBeltDropdown, setShowBeltDropdown] = useState(false)

  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [showComposeModal, setShowComposeModal] = useState(false)

  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    body: '',
  })

  const [composeForm, setComposeForm] = useState({
    subject: '',
    body: '',
  })

  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()
    const { data: authData } = await supabase.auth.getUser()

    if (!authData.user) return

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', authData.user.id)
      .single()

    const userProfileData = userProfile as { school_id: string | null } | null
    if (!userProfileData?.school_id) {
      setLoading(false)
      return
    }

    const schoolId = userProfileData.school_id

    // Fetch belt ranks via API (bypasses RLS)
    try {
      const beltsResponse = await fetch(`/api/belts?school_id=${schoolId}&include_default=false`)
      if (beltsResponse.ok) {
        const beltsData = await beltsResponse.json()
        setBelts(beltsData as BeltRank[])
      }
    } catch (error) {
      console.error('Error fetching belts:', error)
    }

    // Fetch members with emails
    const { data: membersData } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('school_id', schoolId)
      .eq('is_approved', true)
      .in('role', ['student', 'parent'])
      .not('email', 'is', null)
      .order('full_name')

    // Fetch student profiles with belt info
    const { data: studentProfiles } = await supabase
      .from('student_profiles')
      .select('profile_id, belt_rank_id, belt_rank:belt_ranks(id, name, color)')
      .eq('school_id', schoolId)

    // Map belt info to members
    const beltMap = new Map<string, { belt_rank_id: string; name: string; color: string }>()
    if (studentProfiles) {
      studentProfiles.forEach((sp: { profile_id: string; belt_rank_id: string | null; belt_rank: { id: string; name: string; color: string } | null }) => {
        if (sp.belt_rank_id && sp.belt_rank) {
          beltMap.set(sp.profile_id, {
            belt_rank_id: sp.belt_rank_id,
            name: sp.belt_rank.name,
            color: sp.belt_rank.color,
          })
        }
      })
    }

    if (membersData) {
      const recipientsWithBelts = membersData.map((m: { id: string; full_name: string; email: string; role: string }) => {
        const beltInfo = beltMap.get(m.id)
        return {
          ...m,
          belt_rank_id: beltInfo?.belt_rank_id || null,
          belt_rank_name: beltInfo?.name || null,
          belt_rank_color: beltInfo?.color || null,
        }
      })
      setRecipients(recipientsWithBelts)
    }

    // Fetch email templates from local storage for now
    // In production, this would be from a database table
    const storedTemplates = localStorage.getItem(`email_templates_${schoolId}`)
    if (storedTemplates) {
      setTemplates(JSON.parse(storedTemplates))
    }

    setLoading(false)
  }

  const saveTemplates = (newTemplates: EmailTemplate[]) => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase
          .from('profiles')
          .select('school_id')
          .eq('id', data.user.id)
          .single()
          .then(({ data: profile }) => {
            const profileData = profile as { school_id: string | null } | null
            if (profileData?.school_id) {
              localStorage.setItem(`email_templates_${profileData.school_id}`, JSON.stringify(newTemplates))
            }
          })
      }
    })
    setTemplates(newTemplates)
  }

  const handleSaveTemplate = () => {
    if (!templateForm.name.trim() || !templateForm.subject.trim() || !templateForm.body.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    setSaving(true)

    if (editingTemplate) {
      const updated = templates.map(t =>
        t.id === editingTemplate.id
          ? { ...t, name: templateForm.name, subject: templateForm.subject, body: templateForm.body }
          : t
      )
      saveTemplates(updated)
      toast.success('Template updated')
    } else {
      const newTemplate: EmailTemplate = {
        id: crypto.randomUUID(),
        name: templateForm.name,
        subject: templateForm.subject,
        body: templateForm.body,
        created_at: new Date().toISOString(),
      }
      saveTemplates([...templates, newTemplate])
      toast.success('Template created')
    }

    setTemplateForm({ name: '', subject: '', body: '' })
    setEditingTemplate(null)
    setShowTemplateForm(false)
    setSaving(false)
  }

  const handleDeleteTemplate = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      saveTemplates(templates.filter(t => t.id !== id))
      toast.success('Template deleted')
    }
  }

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      body: template.body,
    })
    setShowTemplateForm(true)
  }

  const handleUseTemplate = (template: EmailTemplate) => {
    setComposeForm({
      subject: template.subject,
      body: template.body,
    })
    setShowComposeModal(true)
  }

  const filteredRecipients = recipients.filter(r => {
    // Role filter
    if (recipientFilter === 'students' && r.role !== 'student') return false
    if (recipientFilter === 'parents' && r.role !== 'parent') return false

    // Belt filter (only applies to students)
    if (selectedBelts.length > 0) {
      // If belt filter is active, only show students with selected belts
      if (r.role !== 'student') return false
      if (!r.belt_rank_id || !selectedBelts.includes(r.belt_rank_id)) return false
    }

    return true
  })

  const handleSelectAll = () => {
    if (selectedRecipients.length === filteredRecipients.length) {
      setSelectedRecipients([])
    } else {
      setSelectedRecipients(filteredRecipients.map(r => r.id))
    }
  }

  const handleSendEmail = async () => {
    if (!composeForm.subject.trim() || !composeForm.body.trim()) {
      toast.error('Please enter subject and body')
      return
    }

    if (selectedRecipients.length === 0) {
      toast.error('Please select at least one recipient')
      return
    }

    setSending(true)

    try {
      const selectedEmails = recipients
        .filter(r => selectedRecipients.includes(r.id))
        .map(r => ({ id: r.id, email: r.email, name: r.full_name }))

      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: selectedEmails,
          subject: composeForm.subject,
          body: composeForm.body,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send email')
      }

      toast.success(`Email sent to ${selectedRecipients.length} recipients`)
      setShowComposeModal(false)
      setComposeForm({ subject: '', body: '' })
      setSelectedRecipients([])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Email Templates</h1>
          <p className="text-gray-500 text-sm">Manage email templates and send mass emails</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowComposeModal(true)}>
            <Send className="h-4 w-4 mr-2" />
            Compose Email
          </Button>
          <Button onClick={() => { setEditingTemplate(null); setTemplateForm({ name: '', subject: '', body: '' }); setShowTemplateForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {/* Template Form Modal */}
      {showTemplateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{editingTemplate ? 'Edit Template' : 'Create Template'}</span>
                <Button variant="ghost" size="sm" onClick={() => setShowTemplateForm(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Template Name</Label>
                <Input
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="e.g., Welcome Email, Event Reminder"
                />
              </div>
              <div>
                <Label>Email Subject</Label>
                <Input
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  placeholder="Enter email subject line"
                />
              </div>
              <div>
                <Label>Email Body</Label>
                <textarea
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                  placeholder="Enter email content..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[200px]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  You can use placeholders: {'{name}'} for recipient name
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowTemplateForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveTemplate} isLoading={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Compose Email Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <Card className="w-full max-w-4xl mx-4 my-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Compose Mass Email
                </span>
                <Button variant="ghost" size="sm" onClick={() => setShowComposeModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Recipients */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">Select Recipients</Label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Button
                      size="sm"
                      variant={recipientFilter === 'all' && selectedBelts.length === 0 ? 'default' : 'outline'}
                      onClick={() => { setRecipientFilter('all'); setSelectedBelts([]); }}
                    >
                      <Users className="h-3 w-3 mr-1" />
                      All
                    </Button>
                    <Button
                      size="sm"
                      variant={recipientFilter === 'students' && selectedBelts.length === 0 ? 'default' : 'outline'}
                      onClick={() => { setRecipientFilter('students'); setSelectedBelts([]); }}
                    >
                      <GraduationCap className="h-3 w-3 mr-1" />
                      Students
                    </Button>
                    <Button
                      size="sm"
                      variant={recipientFilter === 'parents' ? 'default' : 'outline'}
                      onClick={() => { setRecipientFilter('parents'); setSelectedBelts([]); }}
                    >
                      <UserCheck className="h-3 w-3 mr-1" />
                      Parents
                    </Button>

                    {/* Belt Filter Dropdown */}
                    <div className="relative">
                      <Button
                        size="sm"
                        variant={selectedBelts.length > 0 ? 'default' : 'outline'}
                        onClick={() => setShowBeltDropdown(!showBeltDropdown)}
                      >
                        <Award className="h-3 w-3 mr-1" />
                        Belts {selectedBelts.length > 0 && `(${selectedBelts.length})`}
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>

                      {showBeltDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-white border rounded-lg shadow-lg z-10">
                          <div className="p-2 border-b">
                            <button
                              className="text-xs text-red-600 hover:underline"
                              onClick={() => { setSelectedBelts([]); setShowBeltDropdown(false); }}
                            >
                              Clear All
                            </button>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {belts.length === 0 ? (
                              <p className="p-3 text-sm text-gray-500">No belts configured</p>
                            ) : (
                              belts.map(belt => (
                                <label
                                  key={belt.id}
                                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedBelts.includes(belt.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedBelts([...selectedBelts, belt.id])
                                        setRecipientFilter('students') // Auto-switch to students when filtering by belt
                                      } else {
                                        setSelectedBelts(selectedBelts.filter(id => id !== belt.id))
                                      }
                                    }}
                                    className="rounded"
                                  />
                                  <span
                                    className="w-3 h-3 rounded-full border"
                                    style={{ backgroundColor: belt.color }}
                                  />
                                  <span className="text-sm">{belt.name}</span>
                                </label>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Belt Tags */}
                  {selectedBelts.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {selectedBelts.map(beltId => {
                        const belt = belts.find(b => b.id === beltId)
                        if (!belt) return null
                        return (
                          <span
                            key={beltId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full"
                            style={{
                              backgroundColor: belt.color,
                              color: belt.color === '#FFFFFF' || belt.color === '#FFFF00' ? '#000' : '#fff'
                            }}
                          >
                            {belt.name}
                            <button
                              onClick={() => setSelectedBelts(selectedBelts.filter(id => id !== beltId))}
                              className="hover:opacity-70"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  )}
                  <div className="border rounded-lg max-h-64 overflow-y-auto">
                    <div className="p-2 border-b bg-gray-50 sticky top-0">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedRecipients.length === filteredRecipients.length && filteredRecipients.length > 0}
                          onChange={handleSelectAll}
                          className="rounded"
                        />
                        <span className="text-sm font-medium">
                          Select All ({filteredRecipients.length})
                        </span>
                      </label>
                    </div>
                    {filteredRecipients.length === 0 ? (
                      <p className="p-4 text-gray-500 text-center">No recipients with email addresses</p>
                    ) : (
                      filteredRecipients.map(recipient => (
                        <label
                          key={recipient.id}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedRecipients.includes(recipient.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRecipients([...selectedRecipients, recipient.id])
                              } else {
                                setSelectedRecipients(selectedRecipients.filter(id => id !== recipient.id))
                              }
                            }}
                            className="rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{recipient.full_name}</p>
                            <p className="text-xs text-gray-500 truncate">{recipient.email}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {recipient.belt_rank_name && (
                              <span
                                className="text-xs px-2 py-0.5 rounded"
                                style={{
                                  backgroundColor: recipient.belt_rank_color || '#gray',
                                  color: recipient.belt_rank_color === '#FFFFFF' || recipient.belt_rank_color === '#FFFF00' ? '#000' : '#fff'
                                }}
                              >
                                {recipient.belt_rank_name}
                              </span>
                            )}
                            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded capitalize">
                              {recipient.role}
                            </span>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {selectedRecipients.length} recipient(s) selected
                  </p>
                </div>

                {/* Email Content */}
                <div className="space-y-4">
                  <div>
                    <Label>Subject</Label>
                    <Input
                      value={composeForm.subject}
                      onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                      placeholder="Enter email subject"
                    />
                  </div>
                  <div>
                    <Label>Message</Label>
                    <textarea
                      value={composeForm.body}
                      onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })}
                      placeholder="Enter your message..."
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[200px]"
                    />
                  </div>
                  {templates.length > 0 && (
                    <div>
                      <Label className="text-sm text-gray-500">Quick Templates</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {templates.map(template => (
                          <Button
                            key={template.id}
                            variant="outline"
                            size="sm"
                            onClick={() => handleUseTemplate(template)}
                          >
                            {template.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowComposeModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSendEmail}
                  isLoading={sending}
                  disabled={selectedRecipients.length === 0}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Email ({selectedRecipients.length})
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Templates List */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Mail className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No templates yet</h3>
            <p className="text-gray-500 mb-4">Create email templates to speed up your mass communication</p>
            <Button onClick={() => setShowTemplateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map(template => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{template.name}</h3>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditTemplate(template)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Subject:</span> {template.subject}
                </p>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                  {template.body}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleUseTemplate(template)}
                >
                  <Send className="h-3 w-3 mr-2" />
                  Use Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-gray-500">Total Recipients</p>
                <p className="text-2xl font-bold">{recipients.length}</p>
              </div>
              <div className="h-10 border-l" />
              <div>
                <p className="text-sm text-gray-500">Students</p>
                <p className="text-xl font-semibold text-blue-600">
                  {recipients.filter(r => r.role === 'student').length}
                </p>
              </div>
              <div className="h-10 border-l" />
              <div>
                <p className="text-sm text-gray-500">Parents</p>
                <p className="text-xl font-semibold text-green-600">
                  {recipients.filter(r => r.role === 'parent').length}
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {templates.length} template(s) saved
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
