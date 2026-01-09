import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Get custom charges for a school
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
      return NextResponse.json({ error: 'Only owners can access charges' }, { status: 403 })
    }

    if (!profile.school_id) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: charges, error } = await (adminClient as any)
      .from('custom_charges')
      .select('*, family:families(name), profile:profiles(full_name)')
      .eq('school_id', profile.school_id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching charges:', error)
      return NextResponse.json({ error: 'Failed to fetch charges' }, { status: 500 })
    }

    return NextResponse.json(charges || [])
  } catch (error) {
    console.error('Custom charges GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create custom charge(s) - supports single or bulk creation
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
      return NextResponse.json({ error: 'Only owners can create charges' }, { status: 403 })
    }

    if (!profile.school_id) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 })
    }

    const body = await request.json()
    const { description, amount, due_date, recipients, family_id } = body

    if (!description || !amount) {
      return NextResponse.json({ error: 'Description and amount are required' }, { status: 400 })
    }

    // Handle new multi-recipient format
    if (recipients && Array.isArray(recipients) && recipients.length > 0) {
      const charges = recipients.map((recipient: { id: string; type: 'family' | 'profile' }) => ({
        school_id: profile.school_id,
        family_id: recipient.type === 'family' ? recipient.id : null,
        profile_id: recipient.type === 'profile' ? recipient.id : null,
        description,
        amount,
        due_date: due_date || null,
        status: 'pending',
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: createdCharges, error } = await (adminClient as any)
        .from('custom_charges')
        .insert(charges)
        .select('*, family:families(name), profile:profiles(full_name)')

      if (error) {
        console.error('Error creating charges:', error)
        return NextResponse.json({ error: 'Failed to create charges' }, { status: 500 })
      }

      return NextResponse.json({ charges: createdCharges, count: createdCharges?.length || 0 })
    }

    // Legacy single-family format (backward compatibility)
    if (!family_id) {
      return NextResponse.json({ error: 'Recipients or family_id required' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: charge, error } = await (adminClient as any)
      .from('custom_charges')
      .insert({
        school_id: profile.school_id,
        family_id,
        description,
        amount,
        due_date: due_date || null,
        status: 'pending',
      })
      .select('*, family:families(name)')
      .single()

    if (error) {
      console.error('Error creating charge:', error)
      return NextResponse.json({ error: 'Failed to create charge' }, { status: 500 })
    }

    return NextResponse.json(charge)
  } catch (error) {
    console.error('Custom charges POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
