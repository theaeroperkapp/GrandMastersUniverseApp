'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Globe, Edit2, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface School {
  id: string
  name: string
  subdomain: string
  subscription_status: string
}

interface SubdomainsClientProps {
  schools: School[]
}

export function SubdomainsClient({ schools: initialSchools }: SubdomainsClientProps) {
  const [schools, setSchools] = useState<School[]>(initialSchools)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const startEditing = (school: School) => {
    setEditingId(school.id)
    setEditValue(school.subdomain)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditValue('')
  }

  const saveSubdomain = async (schoolId: string) => {
    const newSubdomain = editValue.toLowerCase().trim()

    // Validate subdomain
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(newSubdomain)) {
      toast.error('Invalid subdomain format')
      return
    }

    if (newSubdomain.length < 3 || newSubdomain.length > 63) {
      toast.error('Subdomain must be 3-63 characters')
      return
    }

    // Check if already taken
    if (schools.some((s) => s.id !== schoolId && s.subdomain === newSubdomain)) {
      toast.error('Subdomain already in use')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/subdomains', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: schoolId, subdomain: newSubdomain }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update subdomain')
      }

      setSchools(schools.map((s) =>
        s.id === schoolId ? { ...s, subdomain: newSubdomain } : s
      ))
      setEditingId(null)
      toast.success('Subdomain updated')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          School Subdomains
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {schools.map((school) => (
            <div
              key={school.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1">
                <p className="font-medium">{school.name}</p>
                {editingId === school.id ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value.toLowerCase())}
                      className="h-8 w-48"
                      placeholder="subdomain"
                    />
                    <span className="text-sm text-gray-500">.grandmastersuniverse.com</span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    {school.subdomain}.grandmastersuniverse.com
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    school.subscription_status === 'active'
                      ? 'success'
                      : school.subscription_status === 'trial'
                      ? 'warning'
                      : 'secondary'
                  }
                >
                  {school.subscription_status}
                </Badge>
                {editingId === school.id ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelEditing}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveSubdomain(school.id)}
                      isLoading={isLoading}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEditing(school)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {schools.length === 0 && (
            <p className="text-center text-gray-500 py-8">No schools yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
