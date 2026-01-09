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

  // Get contracts for this school
  const { data: contracts } = await supabase
    .from('contracts')
    .select('*')
    .eq('school_id', profileData.school_id)
    .order('created_at', { ascending: false })

  // Get signed contracts
  const { data: signedContracts } = await supabase
    .from('signed_contracts')
    .select('*, contract:contracts(name, title, contract_type, content), signer:profiles(full_name, email)')
    .order('signed_at', { ascending: false })
    .limit(50)

  // Get students for sending contracts (approved members)
  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('school_id', profileData.school_id)
    .eq('is_approved', true)
    .in('role', ['student', 'parent'])

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Contracts & Waivers</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Manage contract templates and track signed documents</p>
      </div>

      <ContractsClient
        contracts={contracts || []}
        signedContracts={signedContracts || []}
        students={students || []}
        schoolId={profileData.school_id}
      />
    </div>
  )
}
