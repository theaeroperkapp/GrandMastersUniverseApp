'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

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

  useEffect(() => {
    fetchUsers()
  }, [])

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
    return <div className="p-8">Loading users...</div>
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">All Users</h1>
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

      <Card>
        <CardContent className="p-0">
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
                    <Button variant="ghost" size="sm">Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
