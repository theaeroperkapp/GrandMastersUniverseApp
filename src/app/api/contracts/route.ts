import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false })

    if (schoolId) {
      query = query.eq('school_id', schoolId)
    }

    const { data: templates, error } = await query

    if (error) {
      console.error('Get contracts error:', error)
      return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 })
    }

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Contracts API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
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
    const {
      school_id,
      name,
      title,
      description,
      contract_type,
      content,
      is_required,
    } = body

    if (!school_id || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const contractName = name || title || 'Untitled Contract'

    const { data: contract, error } = await (adminClient as any)
      .from('contracts')
      .insert({
        school_id,
        name: contractName,
        title: title || contractName,
        description,
        contract_type: contract_type || 'other',
        content,
        is_required: is_required ?? false,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Create contract error:', error)
      return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 })
    }

    return NextResponse.json(contract, { status: 201 })
  } catch (error) {
    console.error('Contracts API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
