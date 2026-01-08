import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET - Get all families for the school
export async function GET(request: NextRequest) {
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

    if (!profileData.school_id) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyAdminClient = adminClient as any

    const { data: families, error } = await anyAdminClient
      .from('families')
      .select('*')
      .eq('school_id', profileData.school_id)
      .order('name')

    if (error) {
      console.error('Get families error:', error)
      return NextResponse.json({ error: 'Failed to fetch families' }, { status: 500 })
    }

    return NextResponse.json(families)
  } catch (error) {
    console.error('Get families error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new family
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

    if (!profileData.school_id) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 })
    }

    const { name, primary_holder_id, billing_email, member_ids } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Family name is required' }, { status: 400 })
    }

    if (!primary_holder_id) {
      return NextResponse.json({ error: 'Primary holder is required' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyAdminClient = adminClient as any

    // Verify the primary holder exists in this school
    const { data: primaryHolder } = await anyAdminClient
      .from('profiles')
      .select('id')
      .eq('id', primary_holder_id)
      .eq('school_id', profileData.school_id)
      .single() as { data: { id: string } | null }

    if (!primaryHolder) {
      return NextResponse.json({ error: 'Primary holder not found in this school' }, { status: 404 })
    }

    // Create the family
    const { data: family, error: familyError } = await anyAdminClient
      .from('families')
      .insert({
        school_id: profileData.school_id,
        name,
        primary_holder_id,
        billing_email: billing_email || null,
      })
      .select()
      .single()

    if (familyError) {
      console.error('Create family error:', familyError)
      return NextResponse.json({ error: 'Failed to create family' }, { status: 500 })
    }

    // If primary_holder_id is provided, update their profile to link to this family
    if (primary_holder_id) {
      await anyAdminClient
        .from('profiles')
        .update({ family_id: family.id })
        .eq('id', primary_holder_id)
        .eq('school_id', profileData.school_id)
    }

    // If member_ids are provided, update their profiles to link to this family
    if (member_ids && Array.isArray(member_ids) && member_ids.length > 0) {
      await anyAdminClient
        .from('profiles')
        .update({ family_id: family.id })
        .in('id', member_ids)
        .eq('school_id', profileData.school_id)
    }

    return NextResponse.json(family, { status: 201 })
  } catch (error) {
    console.error('Create family error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
