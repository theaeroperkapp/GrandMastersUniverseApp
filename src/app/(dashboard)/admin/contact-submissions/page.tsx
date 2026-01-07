'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'

interface ContactSubmission {
  id: string
  name: string
  email: string
  phone: string | null
  message: string
  submission_type: string
  status: string
  created_at: string
}

export default function ContactSubmissionsPage() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubmissions()
  }, [])

  const fetchSubmissions = async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from('contact_submissions')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setSubmissions(data)
    }
    setLoading(false)
  }

  const updateStatus = async (id: string, newStatus: string) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('contact_submissions')
      .update({ status: newStatus } as never)
      .eq('id', id)

    if (error) {
      toast.error('Failed to update status')
    } else {
      toast.success('Status updated')
      setSubmissions(submissions.map(s =>
        s.id === id ? { ...s, status: newStatus } : s
      ))
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800'
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800'
      case 'resolved':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'demo':
        return 'bg-purple-100 text-purple-800'
      case 'support':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="p-8">Loading submissions...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Contact Submissions</h1>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No contact submissions yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <Card key={submission.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{submission.name}</CardTitle>
                    <p className="text-sm text-gray-500">{submission.email}</p>
                    {submission.phone && (
                      <p className="text-sm text-gray-500">{submission.phone}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getTypeColor(submission.submission_type)}>
                      {submission.submission_type}
                    </Badge>
                    <Badge className={getStatusColor(submission.status)}>
                      {submission.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">{submission.message}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    {new Date(submission.created_at).toLocaleString()}
                  </span>
                  <div className="flex gap-2">
                    {submission.status === 'new' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(submission.id, 'contacted')}
                      >
                        Mark Contacted
                      </Button>
                    )}
                    {submission.status !== 'resolved' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(submission.id, 'resolved')}
                      >
                        Mark Resolved
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
