import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PUT - Update belt test fee
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { from_belt_id, to_belt_id, fee, description, is_active } = body

    const adminClient = createAdminClient()

    // Verify user is owner
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single() as { data: { role: string; school_id: string | null } | null }

    if (!profile || profile.role !== 'owner' || !profile.school_id) {
      return NextResponse.json({ error: 'Only owners can update belt test fees' }, { status: 403 })
    }

    // Verify fee belongs to this school
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingFee } = await (adminClient as any)
      .from('belt_test_fees')
      .select('school_id')
      .eq('id', id)
      .single()

    if (!existingFee || existingFee.school_id !== profile.school_id) {
      return NextResponse.json({ error: 'Fee not found' }, { status: 404 })
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (from_belt_id !== undefined) updateData.from_belt_id = from_belt_id || null
    if (to_belt_id !== undefined) updateData.to_belt_id = to_belt_id || null
    if (fee !== undefined) updateData.fee = Math.round(fee)
    if (description !== undefined) updateData.description = description || null
    if (is_active !== undefined) updateData.is_active = is_active

    // Update belt test fee
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedFee, error } = await (adminClient as any)
      .from('belt_test_fees')
      .update(updateData)
      .eq('id', id)
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
      console.error('Error updating belt test fee:', error)
      return NextResponse.json({ error: 'Failed to update fee' }, { status: 500 })
    }

    return NextResponse.json({ fee: updatedFee })
  } catch (error) {
    console.error('Error in belt-tests PUT:', error)
    return NextResponse.json(
      { error: 'Failed to update belt test fee' },
      { status: 500 }
    )
  }
}

// DELETE - Delete belt test fee
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Verify user is owner
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single() as { data: { role: string; school_id: string | null } | null }

    if (!profile || profile.role !== 'owner' || !profile.school_id) {
      return NextResponse.json({ error: 'Only owners can delete belt test fees' }, { status: 403 })
    }

    // Verify fee belongs to this school
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingFee } = await (adminClient as any)
      .from('belt_test_fees')
      .select('school_id')
      .eq('id', id)
      .single()

    if (!existingFee || existingFee.school_id !== profile.school_id) {
      return NextResponse.json({ error: 'Fee not found' }, { status: 404 })
    }

    // Delete the fee
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient as any)
      .from('belt_test_fees')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting belt test fee:', error)
      return NextResponse.json({ error: 'Failed to delete fee' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in belt-tests DELETE:', error)
    return NextResponse.json(
      { error: 'Failed to delete belt test fee' },
      { status: 500 }
    )
  }
}
