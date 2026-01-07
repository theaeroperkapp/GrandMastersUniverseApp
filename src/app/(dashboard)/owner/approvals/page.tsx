import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ApprovalsClient } from '@/components/owner/approvals-client'

export default async function ApprovalsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, school_id')
    .eq('id', user.id)
    .single()

  const profileData = profile as { role: string; school_id: string | null } | null

  if (!profileData || (profileData.role !== 'owner' && profileData.role !== 'admin')) {
    redirect('/feed')
  }

  if (!profileData.school_id) {
    redirect('/feed')
  }

  // Get pending users
  const { data: pendingUsers } = await supabase
    .from('profiles')
    .select('*')
    .eq('school_id', profileData.school_id)
    .eq('is_approved', false)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pending Approvals</h1>
        <p className="text-gray-600">Review and approve new member requests</p>
      </div>

      <ApprovalsClient
        initialUsers={pendingUsers || []}
        schoolId={profileData.school_id}
      />
    </div>
  )
}
