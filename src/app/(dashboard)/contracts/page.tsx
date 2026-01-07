import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ContractSigningClient } from '@/components/contract-signing-client'

export default async function ContractsSigningPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get student profiles linked to this user (as student or parent)
  const { data: studentProfile } = await supabase
    .from('student_profiles')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  const { data: familyLinks } = await supabase
    .from('family_links')
    .select('student_id')
    .eq('parent_id', user.id)

  const studentIds = [
    ...(studentProfile ? [(studentProfile as { id: string }).id] : []),
    ...((familyLinks as { student_id: string }[] | null) || []).map(link => link.student_id),
  ]

  let pendingContracts: any[] = []
  let signedContracts: any[] = []

  if (studentIds.length > 0) {
    // Get pending contracts for these students
    const { data: pending } = await supabase
      .from('pending_contracts')
      .select('*, template:contract_templates(title, contract_type, content, description), student:student_profiles(*, profile:profiles(full_name))')
      .in('student_id', studentIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    pendingContracts = pending || []

    // Get signed contracts for these students
    const { data: signed } = await supabase
      .from('signed_contracts')
      .select('*, template:contract_templates(title, contract_type), student:student_profiles(*, profile:profiles(full_name))')
      .in('student_id', studentIds)
      .order('signed_at', { ascending: false })

    signedContracts = signed || []
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Contracts</h1>
        <p className="text-gray-600">Review and sign contracts and waivers</p>
      </div>

      <ContractSigningClient
        pendingContracts={pendingContracts}
        signedContracts={signedContracts}
      />
    </div>
  )
}
