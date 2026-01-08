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
  Building2,
  Save,
  X,
  ChevronDown,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  created_at: string
}

interface SchoolOwner {
  id: string
  full_name: string
  email: string
  school_name: string
  school_id: string
  subscription_status: string
}

type SubscriptionFilter = 'all' | 'active' | 'trial' | 'past_due' | 'canceled' | 'grace_period'

export default function AdminEmailTemplatesPage() {
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [owners, setOwners] = useState<SchoolOwner[]>([])
  const [selectedOwners, setSelectedOwners] = useState<string[]>([])
  const [subscriptionFilter, setSubscriptionFilter] = useState<SubscriptionFilter>('all')
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

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

    // Check if user is platform admin
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    const userProfileData = userProfile as { role: string } | null
    if (!userProfileData || userProfileData.role !== 'admin') {
      setLoading(false)
      return
    }

    // Fetch all schools with their owners
    const { data: schoolsData } = await supabase
      .from('schools')
      .select('id, name, owner_id, subscription_status')
      .order('name')

    const typedSchoolsData = schoolsData as { id: string; name: string; owner_id: string; subscription_status: string }[] | null

    if (typedSchoolsData) {
      // Fetch owner profiles
      const ownerIds = typedSchoolsData.map(s => s.owner_id)
      const { data: ownersData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ownerIds)

      const typedOwnersData = ownersData as { id: string; full_name: string; email: string }[] | null

      if (typedOwnersData) {
        const ownerMap = new Map(typedOwnersData.map(o => [o.id, o]))
        const ownersWithSchools: SchoolOwner[] = typedSchoolsData
          .map(school => {
            const owner = ownerMap.get(school.owner_id)
            if (!owner || !owner.email) return null
            return {
              id: owner.id,
              full_name: owner.full_name,
              email: owner.email,
              school_name: school.name,
              school_id: school.id,
              subscription_status: school.subscription_status || 'trial',
            }
          })
          .filter((o): o is SchoolOwner => o !== null)

        setOwners(ownersWithSchools)
      }
    }

    // Fetch email templates from local storage
    const storedTemplates = localStorage.getItem('admin_email_templates')
    if (storedTemplates) {
      setTemplates(JSON.parse(storedTemplates))
    }

    setLoading(false)
  }

  const saveTemplates = (newTemplates: EmailTemplate[]) => {
    localStorage.setItem('admin_email_templates', JSON.stringify(newTemplates))
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

  const filteredOwners = owners.filter(o => {
    if (subscriptionFilter === 'all') return true
    return o.subscription_status === subscriptionFilter
  })

  const handleSelectAll = () => {
    if (selectedOwners.length === filteredOwners.length) {
      setSelectedOwners([])
    } else {
      setSelectedOwners(filteredOwners.map(o => o.id))
    }
  }

  const handleSendEmail = async () => {
    if (!composeForm.subject.trim() || !composeForm.body.trim()) {
      toast.error('Please enter subject and body')
      return
    }

    if (selectedOwners.length === 0) {
      toast.error('Please select at least one recipient')
      return
    }

    setSending(true)

    try {
      const selectedEmails = owners
        .filter(o => selectedOwners.includes(o.id))
        .map(o => ({ email: o.email, name: o.full_name }))

      const response = await fetch('/api/admin/email/send', {
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

      toast.success(`Email sent to ${selectedOwners.length} school owners`)
      setShowComposeModal(false)
      setComposeForm({ subject: '', body: '' })
      setSelectedOwners([])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'trial':
        return <Clock className="h-3 w-3 text-blue-500" />
      case 'past_due':
        return <AlertTriangle className="h-3 w-3 text-amber-500" />
      case 'canceled':
        return <XCircle className="h-3 w-3 text-red-500" />
      case 'grace_period':
        return <Clock className="h-3 w-3 text-orange-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700'
      case 'trial':
        return 'bg-blue-100 text-blue-700'
      case 'past_due':
        return 'bg-amber-100 text-amber-700'
      case 'canceled':
        return 'bg-red-100 text-red-700'
      case 'grace_period':
        return 'bg-orange-100 text-orange-700'
      default:
        return 'bg-gray-100 text-gray-700'
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
          <p className="text-gray-500 text-sm">Send mass emails to school owners</p>
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
                  placeholder="e.g., Payment Reminder, Feature Announcement"
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
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Placeholders: {'{name}'} for owner name, {'{school}'} for school name
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
                  Email School Owners
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
                      variant={subscriptionFilter === 'all' ? 'default' : 'outline'}
                      onClick={() => setSubscriptionFilter('all')}
                    >
                      <Building2 className="h-3 w-3 mr-1" />
                      All Schools
                    </Button>

                    {/* Subscription Status Filter */}
                    <div className="relative">
                      <Button
                        size="sm"
                        variant={subscriptionFilter !== 'all' ? 'default' : 'outline'}
                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                      >
                        {subscriptionFilter !== 'all' ? (
                          <>
                            {getStatusIcon(subscriptionFilter)}
                            <span className="ml-1 capitalize">{subscriptionFilter.replace('_', ' ')}</span>
                          </>
                        ) : (
                          'By Status'
                        )}
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>

                      {showFilterDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-40 bg-white border rounded-lg shadow-lg z-10">
                          {(['active', 'trial', 'past_due', 'canceled', 'grace_period'] as SubscriptionFilter[]).map(status => (
                            <button
                              key={status}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left text-sm"
                              onClick={() => {
                                setSubscriptionFilter(status)
                                setShowFilterDropdown(false)
                              }}
                            >
                              {getStatusIcon(status)}
                              <span className="capitalize">{status.replace('_', ' ')}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border rounded-lg max-h-64 overflow-y-auto">
                    <div className="p-2 border-b bg-gray-50 sticky top-0">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedOwners.length === filteredOwners.length && filteredOwners.length > 0}
                          onChange={handleSelectAll}
                          className="rounded"
                        />
                        <span className="text-sm font-medium">
                          Select All ({filteredOwners.length})
                        </span>
                      </label>
                    </div>
                    {filteredOwners.length === 0 ? (
                      <p className="p-4 text-gray-500 text-center">No school owners found</p>
                    ) : (
                      filteredOwners.map(owner => (
                        <label
                          key={`${owner.id}-${owner.school_id}`}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedOwners.includes(owner.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOwners([...selectedOwners, owner.id])
                              } else {
                                setSelectedOwners(selectedOwners.filter(id => id !== owner.id))
                              }
                            }}
                            className="rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{owner.full_name}</p>
                            <p className="text-xs text-gray-500 truncate">{owner.school_name}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${getStatusColor(owner.subscription_status)}`}>
                            {getStatusIcon(owner.subscription_status)}
                            <span className="capitalize">{owner.subscription_status.replace('_', ' ')}</span>
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {selectedOwners.length} owner(s) selected
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
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px]"
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
                  disabled={selectedOwners.length === 0}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Email ({selectedOwners.length})
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
            <p className="text-gray-500 mb-4">Create email templates for school owner communications</p>
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
                <p className="text-sm text-gray-500">Total Schools</p>
                <p className="text-2xl font-bold">{owners.length}</p>
              </div>
              <div className="h-10 border-l" />
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-xl font-semibold text-green-600">
                  {owners.filter(o => o.subscription_status === 'active').length}
                </p>
              </div>
              <div className="h-10 border-l" />
              <div>
                <p className="text-sm text-gray-500">Trial</p>
                <p className="text-xl font-semibold text-blue-600">
                  {owners.filter(o => o.subscription_status === 'trial').length}
                </p>
              </div>
              <div className="h-10 border-l" />
              <div>
                <p className="text-sm text-gray-500">Past Due</p>
                <p className="text-xl font-semibold text-amber-600">
                  {owners.filter(o => o.subscription_status === 'past_due').length}
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
