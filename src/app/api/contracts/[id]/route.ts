import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile to check school_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single()

    const profileData = profile as { school_id: string | null } | null

    if (!profileData?.school_id) {
      return NextResponse.json({ error: 'User not associated with a school' }, { status: 403 })
    }

    // Fetch the contract using admin client (bypasses RLS)
    const { data: contract, error } = await (adminClient as any)
      .from('contracts')
      .select('id, title, name, content, contract_type, is_required, school_id, is_active')
      .eq('id', id)
      .single()

    if (error || !contract) {
      console.error('Contract fetch error:', error)
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Verify user belongs to the same school as the contract
    if (contract.school_id !== profileData.school_id) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Check if user has already signed this contract
    const { data: signedContract } = await (adminClient as any)
      .from('signed_contracts')
      .select('id')
      .eq('contract_id', id)
      .eq('signed_by', user.id)
      .single()

    return NextResponse.json({
      contract: {
        id: contract.id,
        title: contract.title,
        name: contract.name,
        content: contract.content,
        contract_type: contract.contract_type,
        is_required: contract.is_required,
      },
      already_signed: !!signedContract,
    })
  } catch (error) {
    console.error('Get contract error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: string; school_id: string | null } | null

    if (!profileData || (profileData.role !== 'owner' && profileData.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()

    const { data: template, error } = await (adminClient as any)
      .from('contracts')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update contract error:', error)
      return NextResponse.json({ error: 'Failed to update contract' }, { status: 500 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Update contract error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: string; school_id: string | null } | null

    if (!profileData || (profileData.role !== 'owner' && profileData.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error } = await (adminClient as any)
      .from('contracts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete contract error:', error)
      return NextResponse.json({ error: 'Failed to delete contract' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete contract error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
