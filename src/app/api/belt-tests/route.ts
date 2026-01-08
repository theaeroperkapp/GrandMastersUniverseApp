import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET - List belt test fees for school
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get user profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single() as { data: { role: string; school_id: string | null } | null }

    if (!profile?.school_id) {
      return NextResponse.json({ error: 'No school found' }, { status: 404 })
    }

    // Get belt test fees with belt info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fees, error } = await (adminClient as any)
      .from('belt_test_fees')
      .select(`
        id,
        fee,
        description,
        is_active,
        created_at,
        from_belt:belt_ranks!belt_test_fees_from_belt_id_fkey(id, name, color),
        to_belt:belt_ranks!belt_test_fees_to_belt_id_fkey(id, name, color)
      `)
      .eq('school_id', profile.school_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching belt test fees:', error)
      return NextResponse.json({ error: 'Failed to fetch fees' }, { status: 500 })
    }

    return NextResponse.json({ fees: fees || [] })
  } catch (error) {
    console.error('Error in belt-tests GET:', error)
    return NextResponse.json(
      { error: 'Failed to fetch belt test fees' },
      { status: 500 }
    )
  }
}

// POST - Create new belt test fee
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { from_belt_id, to_belt_id, fee, description } = body

    if (!fee || fee <= 0) {
      return NextResponse.json({ error: 'Fee must be greater than 0' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Verify user is owner
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single() as { data: { role: string; school_id: string | null } | null }

    if (!profile || profile.role !== 'owner' || !profile.school_id) {
      return NextResponse.json({ error: 'Only owners can create belt test fees' }, { status: 403 })
    }

    // Create belt test fee
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newFee, error } = await (adminClient as any)
      .from('belt_test_fees')
      .insert({
        school_id: profile.school_id,
        from_belt_id: from_belt_id || null,
        to_belt_id: to_belt_id || null,
        fee: Math.round(fee), // Ensure it's an integer (cents)
        description: description || null,
        is_active: true,
      })
      .select(`
        id,
        fee,
        description,
        is_active,
        created_at,
        from_belt:belt_ranks!belt_test_fees_from_belt_id_fkey(id, name, color),
        to_belt:belt_ranks!belt_test_fees_to_belt_id_fkey(id, name, color)
      `)
      .single()

    if (error) {
      console.error('Error creating belt test fee:', error)
      return NextResponse.json({ error: 'Failed to create fee' }, { status: 500 })
    }

    return NextResponse.json({ fee: newFee })
  } catch (error) {
    console.error('Error in belt-tests POST:', error)
    return NextResponse.json(
      { error: 'Failed to create belt test fee' },
      { status: 500 }
    )
  }
}
