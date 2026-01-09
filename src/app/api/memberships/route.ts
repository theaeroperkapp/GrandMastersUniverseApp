import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Get memberships for a school
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single()

    const profile = profileData as { role: string; school_id: string | null } | null

    if (!profile || profile.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can access memberships' }, { status: 403 })
    }

    if (!profile.school_id) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: memberships, error } = await (adminClient as any)
      .from('memberships')
      .select('*')
      .eq('school_id', profile.school_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching memberships:', error)
      return NextResponse.json({ error: 'Failed to fetch memberships' }, { status: 500 })
    }

    return NextResponse.json(memberships || [])
  } catch (error) {
    console.error('Memberships GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create a membership
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single()

    const profile = profileData as { role: string; school_id: string | null } | null

    if (!profile || profile.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can create memberships' }, { status: 403 })
    }

    if (!profile.school_id) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 })
    }

    const body = await request.json()
    const { name, description, price, billing_period, family_discount_percent } = body

    if (!name || price === undefined) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: membership, error } = await (adminClient as any)
      .from('memberships')
      .insert({
        school_id: profile.school_id,
        name,
        description: description || null,
        price,
        billing_period: billing_period || 'monthly',
        family_discount_percent: family_discount_percent || 0,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating membership:', error)
      return NextResponse.json({ error: 'Failed to create membership' }, { status: 500 })
    }

    return NextResponse.json(membership)
  } catch (error) {
    console.error('Memberships POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
