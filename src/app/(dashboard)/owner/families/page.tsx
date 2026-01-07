'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Family {
  id: string
  name: string
  billing_email: string | null
  primary_holder: {
    full_name: string
    email: string
  }
}

export default function FamiliesPage() {
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchFamilies()
  }, [])

  const fetchFamilies = async () => {
    const supabase = createClient()
    const { data: profile } = await supabase.auth.getUser()

    if (!profile.user) return

    const { data: userProfileData } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', profile.user.id)
      .single()

    const userProfile = userProfileData as unknown as { school_id: string | null } | null
    if (!userProfile?.school_id) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('families')
      .select(`
        id,
        name,
        billing_email,
        primary_holder:profiles!families_primary_holder_id_fkey(full_name, email)
      `)
      .eq('school_id', userProfile.school_id)
      .order('created_at', { ascending: false })

    if (data) {
      setFamilies(data as unknown as Family[])
    }
    setLoading(false)
  }

  const filteredFamilies = families.filter(family =>
    family.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    family.primary_holder?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="p-8">Loading families...</div>
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Families</h1>
        <Button>Add Family</Button>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search families..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filteredFamilies.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No families found. Families are created when parents sign up and join your school.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredFamilies.map((family) => (
            <Card key={family.id}>
              <CardHeader>
                <CardTitle className="text-lg">{family.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Primary: {family.primary_holder?.full_name}
                </p>
                <p className="text-sm text-gray-500">
                  {family.billing_email || family.primary_holder?.email}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
