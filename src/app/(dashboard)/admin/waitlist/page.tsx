'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import toast from 'react-hot-toast'
import { Check, X, Mail, Trash2, Clock, AlertCircle } from 'lucide-react'

interface WaitlistEntry {
  id: string
  name: string
  email: string
  school_name: string
  phone: string | null
  status: 'pending' | 'approved' | 'rejected'
  notes: string | null
  reviewed_at: string | null
  created_at: string
}

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [sendNotification, setSendNotification] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Close modal on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (deleteConfirm) {
        setDeleteConfirm(null)
      } else if (selectedEntry) {
        setSelectedEntry(null)
        setActionType(null)
        setNotes('')
      }
    }
  }, [deleteConfirm, selectedEntry])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    fetchWaitlist()
  }, [])

  const fetchWaitlist = async () => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Waitlist fetch error:', error)
      toast.error('Failed to load waitlist')
    } else if (data) {
      setEntries(data as WaitlistEntry[])
    }
    setLoading(false)
  }

  const openModal = (entry: WaitlistEntry, action: 'approve' | 'reject') => {
    setSelectedEntry(entry)
    setActionType(action)
    setNotes('')
    setSendNotification(true)
  }

  const closeModal = () => {
    setSelectedEntry(null)
    setActionType(null)
    setNotes('')
  }

  const updateStatus = async () => {
    if (!selectedEntry || !actionType) return

    const status = actionType === 'approve' ? 'approved' : 'rejected'
    setProcessing(true)

    try {
      const response = await fetch('/api/admin/waitlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedEntry.id,
          status,
          notes: notes || null,
          sendNotification,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update')
      }

      const result = await response.json()

      let message = `Entry ${status}`
      if (sendNotification) {
        if (result.emailSent) {
          message += ' - notification sent'
        } else if (result.emailError) {
          message += ` - email failed: ${result.emailError}`
        }
      }
      toast.success(message)
      setEntries(entries.map(e =>
        e.id === selectedEntry.id ? { ...e, status, notes: notes || null, reviewed_at: new Date().toISOString() } : e
      ))
      closeModal()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${status} entry`)
    }

    setProcessing(false)
  }

  const deleteEntry = async (id: string) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('waitlist')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete entry')
    } else {
      toast.success('Entry deleted')
      setEntries(entries.filter(e => e.id !== id))
    }
    setDeleteConfirm(null)
  }

  const filteredEntries = entries.filter(entry => {
    const matchesSearch =
      entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.school_name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filter === 'all' || entry.status === filter

    return matchesSearch && matchesFilter
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" />Approved</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><X className="h-3 w-3 mr-1" />Rejected</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const pendingCount = entries.filter(e => e.status === 'pending').length
  const approvedCount = entries.filter(e => e.status === 'approved').length
  const rejectedCount = entries.filter(e => e.status === 'rejected').length

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <Skeleton className="h-8 w-12 mx-auto mb-2" />
                <Skeleton className="h-4 w-16 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-4 w-64" />
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
          <h1 className="text-2xl font-bold">Waitlist</h1>
          <p className="text-gray-500">{entries.length} total entries</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card
          className={`cursor-pointer hover:bg-yellow-50 transition-colors ${filter === 'pending' ? 'ring-2 ring-yellow-400' : ''}`}
          onClick={() => setFilter('pending')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            <p className="text-sm text-gray-500">Pending</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer hover:bg-green-50 transition-colors ${filter === 'approved' ? 'ring-2 ring-green-400' : ''}`}
          onClick={() => setFilter('approved')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
            <p className="text-sm text-gray-500">Approved</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer hover:bg-red-50 transition-colors ${filter === 'rejected' ? 'ring-2 ring-red-400' : ''}`}
          onClick={() => setFilter('rejected')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
            <p className="text-sm text-gray-500">Rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Input
          placeholder="Search by name, email, or school..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({entries.length})
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
          >
            Pending ({pendingCount})
          </Button>
          <Button
            variant={filter === 'approved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('approved')}
          >
            Approved ({approvedCount})
          </Button>
          <Button
            variant={filter === 'rejected' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('rejected')}
          >
            Rejected ({rejectedCount})
          </Button>
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>{searchTerm || filter !== 'all' ? 'No matching entries found.' : 'No waitlist entries yet.'}</p>
            {(searchTerm || filter !== 'all') && (
              <Button
                variant="link"
                className="mt-2"
                onClick={() => { setSearchTerm(''); setFilter('all'); }}
              >
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <Card key={entry.id} className={entry.status === 'pending' ? 'border-yellow-200' : ''}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{entry.name}</h3>
                      {getStatusBadge(entry.status)}
                    </div>
                    <p className="text-gray-600 font-medium">{entry.school_name}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <a
                        href={`mailto:${entry.email}`}
                        className="flex items-center gap-1 hover:text-blue-600"
                      >
                        <Mail className="h-4 w-4" />
                        {entry.email}
                      </a>
                      {entry.phone && <span>{entry.phone}</span>}
                    </div>
                    <p className="text-xs text-gray-400">
                      Applied: {new Date(entry.created_at).toLocaleString()}
                    </p>
                    {entry.notes && (
                      <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                        <strong>Notes:</strong> {entry.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    {entry.status === 'pending' ? (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => openModal(entry, 'approve')}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => openModal(entry, 'reject')}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteConfirm(entry.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approval/Rejection Modal */}
      {selectedEntry && actionType && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>
                {actionType === 'reject' ? 'Reject' : 'Approve'} Application
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">{selectedEntry.name}</p>
                <p className="text-gray-500">{selectedEntry.school_name}</p>
                <p className="text-sm text-gray-500">{selectedEntry.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this decision..."
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendNotification"
                  checked={sendNotification}
                  onChange={(e) => setSendNotification(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="sendNotification" className="text-sm text-gray-700">
                  Send email notification to applicant
                </label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={closeModal}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  className={actionType === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                  onClick={updateStatus}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : actionType === 'reject' ? 'Reject' : 'Approve'}
                </Button>
              </div>
              <p className="text-xs text-gray-400 text-center">Press Escape to cancel</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
        >
          <Card className="w-full max-w-sm mx-4">
            <CardHeader>
              <CardTitle className="text-red-600">Delete Entry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to permanently delete this waitlist entry? This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => deleteEntry(deleteConfirm)}
                >
                  Delete
                </Button>
              </div>
              <p className="text-xs text-gray-400 text-center">Press Escape to cancel</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
