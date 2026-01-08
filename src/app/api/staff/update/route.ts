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

    // Get user profile and verify they're an owner
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: string; school_id: string | null } | null

    if (!profileData || profileData.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can update staff' }, { status: 403 })
    }

    if (!profileData.school_id) {
      return NextResponse.json({ error: 'No school associated with this account' }, { status: 400 })
    }

    const body = await request.json()
    const { member_id, role, sub_roles, action } = body

    if (!member_id) {
      return NextResponse.json({ error: 'Missing member_id' }, { status: 400 })
    }

    // Get the member being updated
    const { data: member } = await (adminClient as ReturnType<typeof createAdminClient>)
      .from('profiles')
      .select('id, full_name, school_id, role')
      .eq('id', member_id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Verify member is in the same school
    if (member.school_id !== profileData.school_id) {
      return NextResponse.json({ error: 'Member is not in your school' }, { status: 403 })
    }

    // Don't allow modifying owners
    if (member.role === 'owner') {
      return NextResponse.json({ error: 'Cannot modify owner accounts' }, { status: 403 })
    }

    // Handle remove action (demote to student)
    if (action === 'remove') {
      const { error: updateError } = await (adminClient as ReturnType<typeof createAdminClient>)
        .from('profiles')
        .update({ role: 'student', sub_roles: [] })
        .eq('id', member_id)

      if (updateError) {
        console.error('Error removing staff:', updateError)
        return NextResponse.json({
          error: `Failed to remove staff: ${updateError.message}`
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `${member.full_name || 'Member'} has been removed from staff`,
      })
    }

    // Handle update action (change role/sub_roles)
    if (action === 'update') {
      if (!role) {
        return NextResponse.json({ error: 'Missing role' }, { status: 400 })
      }

      const { error: updateError } = await (adminClient as ReturnType<typeof createAdminClient>)
        .from('profiles')
        .update({
          role: role,
          sub_roles: sub_roles || [],
        })
        .eq('id', member_id)

      if (updateError) {
        console.error('Error updating staff:', updateError)
        return NextResponse.json({
          error: `Failed to update staff: ${updateError.message}`
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `${member.full_name || 'Member'} has been updated`,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Staff update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
