'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  Send,
  CheckCircle,
  Clock,
  Eye,
  Download,
  Users,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ContractTemplate {
  id: string
  school_id: string
  title: string
  description: string | null
  contract_type: string
  content: string
  is_required: boolean
  is_active: boolean
  created_at: string
}

interface SignedContract {
  id: string
  template_id: string
  student_id: string
  signer_id: string
  signed_at: string
  signature_data: string
  ip_address: string | null
  template: {
    title: string
    contract_type: string
  }
  signer: {
    full_name: string
  }
  student: {
    id: string
    profile: {
      full_name: string
    }
  }
}

interface Student {
  id: string
  profile: {
    id: string
    full_name: string
    email: string
  }
}

interface ContractsClientProps {
  templates: ContractTemplate[]
  signedContracts: SignedContract[]
  students: Student[]
  schoolId: string
}

const CONTRACT_TYPES = [
  { value: 'liability_waiver', label: 'Liability Waiver' },
  { value: 'membership_agreement', label: 'Membership Agreement' },
  { value: 'photo_release', label: 'Photo/Media Release' },
  { value: 'code_of_conduct', label: 'Code of Conduct' },
  { value: 'medical_release', label: 'Medical Release' },
  { value: 'other', label: 'Other' },
]

export function ContractsClient({
  templates: initialTemplates,
  signedContracts: initialSignedContracts,
  students,
  schoolId,
}: ContractsClientProps) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [signedContracts] = useState(initialSignedContracts)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null)
  const [viewingContract, setViewingContract] = useState<SignedContract | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'templates' | 'signed'>('templates')
  const router = useRouter()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contract_type: 'liability_waiver',
    content: '',
    is_required: true,
  })

  const openCreateModal = () => {
    setEditingTemplate(null)
    setFormData({
      title: '',
      description: '',
      contract_type: 'liability_waiver',
      content: getDefaultContent('liability_waiver'),
      is_required: true,
    })
    setIsModalOpen(true)
  }

  const openEditModal = (template: ContractTemplate) => {
    setEditingTemplate(template)
    setFormData({
      title: template.title,
      description: template.description || '',
      contract_type: template.contract_type,
      content: template.content,
      is_required: template.is_required,
    })
    setIsModalOpen(true)
  }

  const openSendModal = (template: ContractTemplate) => {
    setSelectedTemplate(template)
    setSelectedStudents([])
    setIsSendModalOpen(true)
  }

  const openViewModal = (contract: SignedContract) => {
    setViewingContract(contract)
    setIsViewModalOpen(true)
  }

  const getDefaultContent = (type: string) => {
    switch (type) {
      case 'liability_waiver':
        return `LIABILITY WAIVER AND RELEASE

I, the undersigned, acknowledge that participation in martial arts training involves inherent risks of injury. I voluntarily assume all risks associated with participation in classes, training sessions, and events.

I hereby release and hold harmless the school, its owners, instructors, and staff from any claims, damages, or injuries that may occur during training.

I confirm that I am physically fit to participate in martial arts training and have no medical conditions that would prevent safe participation.

By signing below, I acknowledge that I have read, understood, and agree to the terms of this waiver.`
      case 'photo_release':
        return `PHOTO/MEDIA RELEASE

I hereby grant permission to the school to use photographs, videos, and other media featuring myself or my child for promotional, educational, and social media purposes.

I understand that these images may be used on the school's website, social media accounts, promotional materials, and other marketing channels.

I waive any right to inspect or approve the finished product or the copy that may be used.`
      default:
        return ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const payload = {
        school_id: schoolId,
        title: formData.title,
        description: formData.description || null,
        contract_type: formData.contract_type,
        content: formData.content,
        is_required: formData.is_required,
      }

      const url = editingTemplate ? `/api/contracts/${editingTemplate.id}` : '/api/contracts'
      const response = await fetch(url, {
        method: editingTemplate ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save template')
      }

      const savedTemplate = await response.json()

      if (editingTemplate) {
        setTemplates(templates.map(t => t.id === savedTemplate.id ? savedTemplate : t))
        toast.success('Template updated successfully')
      } else {
        setTemplates([savedTemplate, ...templates])
        toast.success('Template created successfully')
      }

      setIsModalOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const response = await fetch(`/api/contracts/${templateId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete template')

      setTemplates(templates.filter(t => t.id !== templateId))
      toast.success('Template deleted successfully')
      router.refresh()
    } catch {
      toast.error('Failed to delete template')
    }
  }

  const handleSendContracts = async () => {
    if (!selectedTemplate || selectedStudents.length === 0) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/contracts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          student_ids: selectedStudents,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send contracts')
      }

      toast.success(`Contracts sent to ${selectedStudents.length} student(s)`)
      setIsSendModalOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send contracts')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleActive = async (template: ContractTemplate) => {
    try {
      const response = await fetch(`/api/contracts/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !template.is_active }),
      })

      if (!response.ok) throw new Error('Failed to update template')

      const updated = await response.json()
      setTemplates(templates.map(t => t.id === updated.id ? updated : t))
      toast.success(updated.is_active ? 'Template activated' : 'Template deactivated')
    } catch {
      toast.error('Failed to update template')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Get unsigned students for a template
  const getUnsignedStudents = (templateId: string) => {
    const signedStudentIds = signedContracts
      .filter(c => c.template_id === templateId)
      .map(c => c.student_id)
    return students.filter(s => !signedStudentIds.includes(s.id))
  }

  return (
    <>
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'templates'
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Templates
        </button>
        <button
          onClick={() => setActiveTab('signed')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'signed'
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Signed Contracts ({signedContracts.length})
        </button>
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <>
          <div className="flex justify-end">
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>

          <div className="grid gap-4">
            {templates.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">No contract templates yet</p>
                  <Button onClick={openCreateModal}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              templates.map(template => {
                const unsignedCount = getUnsignedStudents(template.id).length
                const signedCount = signedContracts.filter(c => c.template_id === template.id).length

                return (
                  <Card key={template.id} className={!template.is_active ? 'opacity-60' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-5 w-5 text-gray-500" />
                            <h3 className="font-semibold">{template.title}</h3>
                            <Badge variant="outline">
                              {CONTRACT_TYPES.find(t => t.value === template.contract_type)?.label}
                            </Badge>
                            {template.is_required && (
                              <Badge className="bg-red-100 text-red-700">Required</Badge>
                            )}
                            {!template.is_active && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          {template.description && (
                            <p className="text-sm text-gray-500 mb-2">{template.description}</p>
                          )}
                          <div className="flex gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              {signedCount} signed
                            </span>
                            {unsignedCount > 0 && (
                              <span className="flex items-center gap-1">
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                {unsignedCount} pending
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openSendModal(template)}
                            disabled={!template.is_active}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Send
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => toggleActive(template)}>
                            {template.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(template)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </>
      )}

      {/* Signed Contracts Tab */}
      {activeTab === 'signed' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Signed Contracts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {signedContracts.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No contracts have been signed yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {signedContracts.map(contract => (
                  <div
                    key={contract.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">{contract.template?.title}</p>
                        <p className="text-sm text-gray-500">
                          Signed by {contract.signer?.full_name} for {contract.student?.profile?.full_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">{formatDate(contract.signed_at)}</span>
                      <Button variant="ghost" size="sm" onClick={() => openViewModal(contract)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Template Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTemplate ? 'Edit Template' : 'Create Template'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Template Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Liability Waiver 2024"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this contract"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contract_type">Contract Type *</Label>
            <select
              id="contract_type"
              value={formData.contract_type}
              onChange={(e) => {
                const newType = e.target.value
                setFormData({
                  ...formData,
                  contract_type: newType,
                  content: formData.content || getDefaultContent(newType),
                })
              }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            >
              {CONTRACT_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Contract Content *</Label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Enter the full contract text..."
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[200px] font-mono text-sm"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_required"
              checked={formData.is_required}
              onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="is_required">Required for all students</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Send Contracts Modal */}
      <Modal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        title={`Send: ${selectedTemplate?.title}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select students to send this contract to. They will receive a notification to sign.
          </p>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {selectedTemplate && getUnsignedStudents(selectedTemplate.id).map(student => (
              <label
                key={student.id}
                className="flex items-center gap-3 p-2 border rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedStudents([...selectedStudents, student.id])
                    } else {
                      setSelectedStudents(selectedStudents.filter(id => id !== student.id))
                    }
                  }}
                  className="rounded"
                />
                <div>
                  <p className="font-medium">{student.profile.full_name}</p>
                  <p className="text-sm text-gray-500">{student.profile.email}</p>
                </div>
              </label>
            ))}
            {selectedTemplate && getUnsignedStudents(selectedTemplate.id).length === 0 && (
              <p className="text-center text-gray-500 py-4">All students have signed this contract</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsSendModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendContracts}
              disabled={selectedStudents.length === 0}
              isLoading={isLoading}
            >
              <Send className="h-4 w-4 mr-2" />
              Send to {selectedStudents.length} Student(s)
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Signed Contract Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Signed Contract"
      >
        {viewingContract && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">{viewingContract.template?.title}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Student:</span>
                  <p className="font-medium">{viewingContract.student?.profile?.full_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Signed by:</span>
                  <p className="font-medium">{viewingContract.signer?.full_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Signed at:</span>
                  <p className="font-medium">{formatDate(viewingContract.signed_at)}</p>
                </div>
                <div>
                  <span className="text-gray-500">IP Address:</span>
                  <p className="font-medium">{viewingContract.ip_address || 'N/A'}</p>
                </div>
              </div>
            </div>

            {viewingContract.signature_data && (
              <div>
                <Label>Signature</Label>
                <div className="border rounded-lg p-4 bg-white">
                  <img
                    src={viewingContract.signature_data}
                    alt="Signature"
                    className="max-h-24 mx-auto"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                Close
              </Button>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
