import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ContractsClient } from '@/components/owner/contracts-client'

interface ProfileData {
  role: string
  school_id: string | null
}

export default async function ContractsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, school_id')
    .eq('id', user.id)
    .single()

  const profileData = profile as ProfileData | null

  if (!profileData || (profileData.role !== 'owner' && profileData.role !== 'admin')) {
    redirect('/feed')
  }

  if (!profileData.school_id) {
    redirect('/feed')
  }

  // Get contract templates for this school
  const { data: templates } = await supabase
    .from('contract_templates')
    .select('*')
    .eq('school_id', profileData.school_id)
    .order('created_at', { ascending: false })

  // Get signed contracts
  const { data: signedContracts } = await supabase
    .from('signed_contracts')
    .select('*, template:contract_templates(title, contract_type), signer:profiles(full_name), student:student_profiles(*, profile:profiles(full_name))')
    .eq('school_id', profileData.school_id)
    .order('signed_at', { ascending: false })
    .limit(50)

  // Get students for sending contracts
  const { data: students } = await supabase
    .from('student_profiles')
    .select('*, profile:profiles(id, full_name, email)')
    .eq('school_id', profileData.school_id)
    .eq('is_active', true)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contracts & Waivers</h1>
        <p className="text-gray-600">Manage contract templates and track signed documents</p>
      </div>

      <ContractsClient
        templates={templates || []}
        signedContracts={signedContracts || []}
        students={students || []}
        schoolId={profileData.school_id}
      />
    </div>
  )
}
