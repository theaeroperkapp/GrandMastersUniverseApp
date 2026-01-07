'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'
import { Trash2, Mail } from 'lucide-react'

interface WaitlistEntry {
  id: string
  name: string
  email: string
  school_name: string
  phone: string | null
  created_at: string
}

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

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

  const deleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to remove this entry?')) return

    const supabase = createClient()

    const { error } = await supabase
      .from('waitlist')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete entry')
    } else {
      toast.success('Entry removed')
      setEntries(entries.filter(e => e.id !== id))
    }
  }

  const filteredEntries = entries.filter(entry =>
    entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.school_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="p-8">Loading waitlist...</div>
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Waitlist</h1>
          <p className="text-gray-500">{entries.length} entries</p>
        </div>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search by name, email, or school..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            {searchTerm ? 'No matching entries found.' : 'No waitlist entries yet.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{entry.name}</h3>
                    <p className="text-gray-600">{entry.school_name}</p>
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
                      Joined: {new Date(entry.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = `mailto:${entry.email}`}
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Contact
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteEntry(entry.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
