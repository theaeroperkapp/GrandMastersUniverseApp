'use client'

import { useState } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Check, X, User } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import toast from 'react-hot-toast'

interface PendingUser {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: string
  account_type: string
  created_at: string
}

interface ApprovalsClientProps {
  initialUsers: PendingUser[]
  schoolId: string
}

export function ApprovalsClient({ initialUsers, schoolId }: ApprovalsClientProps) {
  const [users, setUsers] = useState<PendingUser[]>(initialUsers)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  const handleApprove = async (userId: string) => {
    setProcessingIds((prev) => new Set(prev).add(userId))

    try {
      const response = await fetch('/api/owner/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, action: 'approve', school_id: schoolId }),
      })

      if (!response.ok) throw new Error()

      setUsers(users.filter((u) => u.id !== userId))
      toast.success('User approved successfully')
    } catch {
      toast.error('Failed to approve user')
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  const handleDeny = async (userId: string) => {
    if (!confirm('Are you sure you want to deny this request? The user will be removed.')) {
      return
    }

    setProcessingIds((prev) => new Set(prev).add(userId))

    try {
      const response = await fetch('/api/owner/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, action: 'deny', school_id: schoolId }),
      })

      if (!response.ok) throw new Error()

      setUsers(users.filter((u) => u.id !== userId))
      toast.success('Request denied')
    } catch {
      toast.error('Failed to deny request')
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <User className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Approvals</h3>
          <p className="text-gray-500">All membership requests have been processed.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <Card key={user.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar
                  src={user.avatar_url}
                  name={user.full_name}
                  size="lg"
                />
                <div>
                  <h3 className="font-medium">{user.full_name}</h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="capitalize">
                      {user.role}
                    </Badge>
                    <Badge variant={user.account_type === 'minor' ? 'warning' : 'outline'}>
                      {user.account_type === 'minor' ? 'Minor' : 'Adult'}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      Requested {formatRelativeTime(user.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeny(user.id)}
                  disabled={processingIds.has(user.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  Deny
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApprove(user.id)}
                  disabled={processingIds.has(user.id)}
                  isLoading={processingIds.has(user.id)}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
