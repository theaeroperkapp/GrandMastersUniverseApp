import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, ExternalLink, Settings } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default async function AdminSchoolsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const profileData = profile as { role: string } | null
  if (!profileData || profileData.role !== 'admin') {
    redirect('/feed')
  }

  // Get all schools with owner info
  const { data: schools } = await supabase
    .from('schools')
    .select(`
      *,
      owner:profiles!schools_owner_id_fkey(id, full_name, email)
    `)
    .order('created_at', { ascending: false })

  // Get student counts per school
  const { data: studentCounts } = await supabase
    .from('student_profiles')
    .select('school_id')

  const countBySchool: Record<string, number> = {}
  const counts = studentCounts as Array<{ school_id: string }> | null
  counts?.forEach((s) => {
    countBySchool[s.school_id] = (countBySchool[s.school_id] || 0) + 1
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>
      case 'trial':
        return <Badge variant="warning">Trial</Badge>
      case 'past_due':
        return <Badge variant="destructive">Past Due</Badge>
      case 'canceled':
        return <Badge variant="secondary">Canceled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Schools</h1>
          <p className="text-gray-600">Manage all schools on the platform</p>
        </div>
        <Link href="/admin/schools/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add School
          </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {schools?.map((school: any) => (
          <Card key={school.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{school.name}</h3>
                    {getStatusBadge(school.subscription_status)}
                  </div>
                  <p className="text-sm text-gray-500 mb-1">
                    {school.subdomain}.grandmastersuniverse.com
                  </p>
                  <p className="text-sm text-gray-500">
                    Owner: {school.owner?.full_name || 'Unknown'} ({school.owner?.email})
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                    <span>{countBySchool[school.id] || 0} students</span>
                    <span>Created {formatDate(school.created_at, 'PP')}</span>
                    {school.trial_ends_at && (
                      <span>Trial ends {formatDate(school.trial_ends_at, 'PP')}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://${school.subdomain}.grandmastersuniverse.com`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-gray-100"
                  >
                    <ExternalLink className="h-5 w-5 text-gray-500" />
                  </a>
                  <Link
                    href={`/admin/schools/${school.id}/features`}
                    className="p-2 rounded-lg hover:bg-gray-100"
                  >
                    <Settings className="h-5 w-5 text-gray-500" />
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!schools || schools.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No schools yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
