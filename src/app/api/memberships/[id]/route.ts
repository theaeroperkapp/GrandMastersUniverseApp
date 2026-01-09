import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Update a membership
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
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
      return NextResponse.json({ error: 'Only owners can update memberships' }, { status: 403 })
    }

    if (!profile.school_id) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 })
    }

    const body = await request.json()
    const { name, description, price, billing_period, family_discount_percent, is_active } = body

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: membership, error } = await (adminClient as any)
      .from('memberships')
      .update({
        name,
        description: description || null,
        price,
        billing_period,
        family_discount_percent: family_discount_percent || 0,
        is_active: is_active !== undefined ? is_active : true,
      })
      .eq('id', id)
      .eq('school_id', profile.school_id) // Ensure owner can only update their own
      .select()
      .single()

    if (error) {
      console.error('Error updating membership:', error)
      return NextResponse.json({ error: 'Failed to update membership' }, { status: 500 })
    }

    return NextResponse.json(membership)
  } catch (error) {
    console.error('Memberships PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete a membership
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
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
      return NextResponse.json({ error: 'Only owners can delete memberships' }, { status: 403 })
    }

    if (!profile.school_id) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient as any)
      .from('memberships')
      .delete()
      .eq('id', id)
      .eq('school_id', profile.school_id) // Ensure owner can only delete their own

    if (error) {
      console.error('Error deleting membership:', error)
      return NextResponse.json({ error: 'Failed to delete membership' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Memberships DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Toggle membership active status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
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
      return NextResponse.json({ error: 'Only owners can update memberships' }, { status: 403 })
    }

    if (!profile.school_id) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 })
    }

    const body = await request.json()
    const { is_active } = body

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: membership, error } = await (adminClient as any)
      .from('memberships')
      .update({ is_active })
      .eq('id', id)
      .eq('school_id', profile.school_id)
      .select()
      .single()

    if (error) {
      console.error('Error toggling membership:', error)
      return NextResponse.json({ error: 'Failed to update membership' }, { status: 500 })
    }

    return NextResponse.json(membership)
  } catch (error) {
    console.error('Memberships PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
