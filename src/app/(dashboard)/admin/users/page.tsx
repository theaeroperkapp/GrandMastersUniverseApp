'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Trash2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

interface User {
  id: string
  email: string
  full_name: string
  role: string
  is_approved: boolean
  created_at: string
  school_id: string | null
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
    getCurrentUser()
  }, [])

  const getCurrentUser = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
    }
  }

  const fetchUsers = async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setUsers(data)
    }
    setLoading(false)
  }

  const handleDelete = async (user: User) => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user')
      }

      toast.success(`User "${user.full_name}" deleted successfully`)
      setUsers(users.filter(u => u.id !== user.id))
      setDeleteConfirm(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete user')
    } finally {
      setDeleting(false)
    }
  }

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-500'
      case 'owner': return 'bg-blue-500'
      case 'parent': return 'bg-green-500'
      case 'student': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return <div className="p-4 md:p-8">Loading users...</div>
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-xl md:text-2xl font-bold">All Users</h1>
        <div className="text-sm text-gray-500">
          Total: {users.length} users
        </div>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredUsers.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="font-medium truncate">{user.full_name}</p>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {user.role}
                    </Badge>
                    <Badge variant={user.is_approved ? 'default' : 'secondary'}>
                      {user.is_approved ? 'Approved' : 'Pending'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Joined: {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
                {user.id !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteConfirm(user)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium">Name</th>
                  <th className="text-left p-4 font-medium">Email</th>
                  <th className="text-left p-4 font-medium">Role</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Joined</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">{user.full_name}</td>
                    <td className="p-4 text-gray-500">{user.email}</td>
                    <td className="p-4">
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={user.is_approved ? 'default' : 'secondary'}>
                        {user.is_approved ? 'Approved' : 'Pending'}
                      </Badge>
                    </td>
                    <td className="p-4 text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      {user.id !== currentUserId ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteConfirm(user)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      ) : (
                        <span className="text-gray-400 text-sm">Current user</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {filteredUsers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? 'No users match your search.' : 'No users found.'}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null) }}
        >
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Delete User
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to permanently delete this user?
              </p>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{deleteConfirm.full_name}</p>
                <p className="text-sm text-gray-500">{deleteConfirm.email}</p>
                <p className="text-xs text-gray-400 mt-1">Role: {deleteConfirm.role}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg text-sm text-red-700">
                <strong>Warning:</strong> This will permanently delete:
                <ul className="list-disc list-inside mt-1">
                  <li>User account and login credentials</li>
                  <li>All posts, comments, and likes</li>
                  {deleteConfirm.role === 'owner' && <li>Their school and all school data</li>}
                </ul>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete User'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
