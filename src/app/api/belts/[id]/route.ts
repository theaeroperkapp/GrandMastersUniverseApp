import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

    // Check if user is owner or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: string; school_id: string | null } | null
    if (!profileData || (profileData.role !== 'owner' && profileData.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyAdminClient = adminClient as any

    // Check that the belt belongs to this school and is not a default belt
    const { data: belt } = await anyAdminClient
      .from('belt_ranks')
      .select('id, school_id, is_default')
      .eq('id', id)
      .single() as { data: { id: string; school_id: string | null; is_default: boolean } | null }

    if (!belt) {
      return NextResponse.json({ error: 'Belt rank not found' }, { status: 404 })
    }

    if (belt.is_default) {
      return NextResponse.json({ error: 'Cannot delete default belt ranks' }, { status: 403 })
    }

    if (belt.school_id !== profileData.school_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete the belt
    const { error } = await anyAdminClient
      .from('belt_ranks')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete belt error:', error)
      return NextResponse.json({ error: 'Failed to delete belt rank' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete belt API error:', error)
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

    // Check if user is owner or admin
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
    const { name, color, display_order } = body

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (color !== undefined) updateData.color = color
    if (display_order !== undefined) updateData.display_order = display_order

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyAdminClient = adminClient as any

    const { data: belt, error } = await anyAdminClient
      .from('belt_ranks')
      .update(updateData)
      .eq('id', id)
      .eq('school_id', profileData.school_id) // Ensure user can only update their own belts
      .select()
      .single()

    if (error) {
      console.error('Update belt error:', error)
      return NextResponse.json({ error: 'Failed to update belt rank' }, { status: 500 })
    }

    return NextResponse.json(belt)
  } catch (error) {
    console.error('Update belt API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
