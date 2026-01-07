import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BeltsClient } from '@/components/owner/belts-client'

export default async function BeltsPage() {
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

  // Get default belts
  const { data: defaultBelts } = await supabase
    .from('belt_ranks')
    .select('*')
    .eq('is_default', true)
    .order('display_order')

  // Get custom belts for this school
  const { data: customBelts } = await supabase
    .from('belt_ranks')
    .select('*')
    .eq('school_id', profileData.school_id)
    .eq('is_default', false)
    .order('display_order')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Belt Ranks</h1>
        <p className="text-gray-600">Manage belt ranks for your school</p>
      </div>

      <BeltsClient
        defaultBelts={defaultBelts || []}
        customBelts={customBelts || []}
        schoolId={profileData.school_id}
      />
    </div>
  )
}
