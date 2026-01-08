import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contract_id, signature_data, agreed_to_terms } = body

    if (!contract_id || !signature_data || !agreed_to_terms) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the contract using admin client (bypasses RLS)
    const { data: contract } = await (adminClient as any)
      .from('contracts')
      .select('id, school_id, title, name, content')
      .eq('id', contract_id)
      .single()

    const contractData = contract as {
      id: string
      school_id: string
      title: string
      name: string
      content: string
    } | null

    if (!contractData) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Get user's profile to verify school and get family_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('family_id, school_id')
      .eq('id', user.id)
      .single()

    const profileData = profile as { family_id: string | null; school_id: string | null } | null

    // Verify user belongs to the same school as the contract
    if (!profileData?.school_id || profileData.school_id !== contractData.school_id) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Check if already signed
    const { data: existingSigned } = await (adminClient as any)
      .from('signed_contracts')
      .select('id')
      .eq('contract_id', contract_id)
      .eq('signed_by', user.id)
      .single()

    if (existingSigned) {
      return NextResponse.json({ error: 'You have already signed this contract' }, { status: 400 })
    }

    // Get IP address
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown'

    // Create signed contract
    const { data: signedContract, error: signError } = await (adminClient as any)
      .from('signed_contracts')
      .insert({
        contract_id: contractData.id,
        family_id: profileData?.family_id,
        signed_by: user.id,
        signature_data,
        ip_address: ip,
      })
      .select()
      .single()

    if (signError) {
      console.error('Sign contract error:', signError)
      return NextResponse.json({ error: 'Failed to sign contract' }, { status: 500 })
    }

    // Mark related notification as read
    await (adminClient as any)
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .ilike('link', `%${contract_id}%`)

    // Notify school owner that contract was signed
    try {
      // Get school owner
      const { data: school } = await (adminClient as any)
        .from('schools')
        .select('owner_id')
        .eq('id', contractData.school_id)
        .single()

      // Get signer's name
      const { data: signerProfile } = await (adminClient as any)
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      if (school?.owner_id) {
        const signerName = signerProfile?.full_name || 'A member'
        const contractName = contractData.title || contractData.name

        await (adminClient as any)
          .from('notifications')
          .insert({
            user_id: school.owner_id,
            type: 'contract_signed',
            title: 'Contract Signed',
            message: `${signerName} has signed "${contractName}"`,
            link: '/owner/contracts',
            is_read: false,
          })
      }
    } catch (notifyError) {
      // Don't fail the request if notification fails
      console.error('Failed to notify owner:', notifyError)
    }

    return NextResponse.json({
      success: true,
      signed_contract_id: signedContract.id,
    }, { status: 201 })
  } catch (error) {
    console.error('Sign contract API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get contracts available for the current user to sign
export async function GET() {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, role')
      .eq('id', user.id)
      .single()

    const profileData = profile as { school_id: string | null; role: string } | null

    if (!profileData?.school_id) {
      return NextResponse.json([])
    }

    // Get all active contracts for the school using admin client (bypasses RLS)
    const { data: contracts } = await (adminClient as any)
      .from('contracts')
      .select('*')
      .eq('school_id', profileData.school_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    // Get signed contracts for this user
    const { data: signedContracts } = await (adminClient as any)
      .from('signed_contracts')
      .select('contract_id')
      .eq('signed_by', user.id)

    const signedContractIds = (signedContracts || []).map((sc: { contract_id: string }) => sc.contract_id)

    // Filter to unsigned contracts
    const unsignedContracts = (contracts || []).filter(
      (contract: { id: string }) => !signedContractIds.includes(contract.id)
    )

    return NextResponse.json(unsignedContracts)
  } catch (error) {
    console.error('Get contracts to sign API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
