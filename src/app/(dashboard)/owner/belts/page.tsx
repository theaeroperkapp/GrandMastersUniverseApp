import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { BeltsClient } from '@/components/owner/belts-client'

// Disable caching to always fetch fresh data
export const dynamic = 'force-dynamic'

export default async function BeltsPage() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

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

  // Get default belts (used as template for schools without belts)
  const { data: defaultBelts } = await adminClient
    .from('belt_ranks')
    .select('*')
    .eq('is_default', true)
    .order('display_order')

  // Get school's belts
  const { data: schoolBelts } = await adminClient
    .from('belt_ranks')
    .select('*')
    .eq('school_id', profileData.school_id)
    .order('display_order')

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Belt Ranks</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Manage belt ranks for your school</p>
      </div>

      <BeltsClient
        defaultBelts={defaultBelts || []}
        customBelts={schoolBelts || []}
        schoolId={profileData.school_id}
        disabledBelts={[]}
      />
    </div>
  )
}
