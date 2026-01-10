import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ContractSigningClient } from '@/components/contract-signing-client'

export default async function ContractsSigningPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get user profile with school and family info
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, school_id, family_id')
    .eq('id', user.id)
    .single()

  const profileData = profile as { id: string; school_id: string | null; family_id: string | null } | null

  if (!profileData?.school_id) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Contracts</h1>
          <p className="text-gray-600">No contracts available</p>
        </div>
      </div>
    )
  }

  // Get all active contracts for this school
  const { data: allContracts } = await supabase
    .from('contracts')
    .select('*')
    .eq('school_id', profileData.school_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Get signed contracts for this user (by their profile id as signer)
  const { data: userSignedContracts } = await supabase
    .from('signed_contracts')
    .select('*, contract:contracts(id, name, content)')
    .eq('signed_by', user.id)
    .order('signed_at', { ascending: false })

  const signedContractIds = (userSignedContracts || []).map(
    (sc: { contract_id: string }) => sc.contract_id
  )

  // Filter out contracts that have already been signed
  const pendingContracts = (allContracts || []).filter(
    (contract: { id: string }) => !signedContractIds.includes(contract.id)
  )

  // Transform to match the client component's expected format
  const formattedPending = pendingContracts.map((contract: any) => ({
    id: contract.id,
    contract_id: contract.id,
    template: {
      title: contract.title || contract.name,
      content: contract.content,
      contract_type: contract.contract_type || 'waiver',
      description: contract.description || '',
    },
    status: 'pending',
    created_at: contract.created_at,
  }))

  const formattedSigned = (userSignedContracts || []).map((sc: any) => ({
    id: sc.id,
    contract_id: sc.contract_id,
    template: {
      title: sc.contract?.name || 'Contract',
      contract_type: 'waiver',
    },
    signed_at: sc.signed_at,
    signature_data: sc.signature_data,
  }))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Contracts</h1>
        <p className="text-gray-600">Review and sign contracts and waivers</p>
      </div>

      <ContractSigningClient
        pendingContracts={formattedPending}
        signedContracts={formattedSigned}
      />
    </div>
  )
}
