import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PATCH - Update/assign student's individual subscription
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

    // Check if user is owner/admin
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

    const { membership_id } = await request.json()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyAdminClient = adminClient as any

    // Check if target profile belongs to the same school
    const { data: targetProfile } = await anyAdminClient
      .from('profiles')
      .select('id, school_id')
      .eq('id', id)
      .single() as { data: { id: string; school_id: string } | null }

    if (!targetProfile || targetProfile.school_id !== profileData.school_id) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // If membership_id is provided, verify it belongs to the school
    if (membership_id) {
      const { data: membership } = await anyAdminClient
        .from('memberships')
        .select('id')
        .eq('id', membership_id)
        .eq('school_id', profileData.school_id)
        .single() as { data: { id: string } | null }

      if (!membership) {
        return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
      }
    }

    // Check if profile_membership exists
    const { data: existingMembership } = await anyAdminClient
      .from('profile_memberships')
      .select('id')
      .eq('profile_id', id)
      .single() as { data: { id: string } | null }

    if (membership_id) {
      // Assign or update subscription
      if (existingMembership) {
        // Update existing
        const { data: updated, error: updateError } = await anyAdminClient
          .from('profile_memberships')
          .update({
            membership_id,
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingMembership.id)
          .select('id, membership_id, status')
          .single()

        if (updateError) {
          console.error('Update subscription error:', updateError)
          return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          id: updated?.id,
          membership_id: updated?.membership_id,
          status: updated?.status,
        })
      } else {
        // Create new
        const { data: created, error: createError } = await anyAdminClient
          .from('profile_memberships')
          .insert({
            profile_id: id,
            membership_id,
            status: 'active',
          })
          .select('id, membership_id, status')
          .single()

        if (createError) {
          console.error('Create subscription error:', createError)
          return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          id: created?.id,
          membership_id: created?.membership_id,
          status: created?.status,
        })
      }
    } else {
      // Remove subscription
      if (existingMembership) {
        const { error: deleteError } = await anyAdminClient
          .from('profile_memberships')
          .delete()
          .eq('id', existingMembership.id)

        if (deleteError) {
          console.error('Delete subscription error:', deleteError)
          return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
        }
      }

      return NextResponse.json({
        success: true,
        id: null,
        membership_id: null,
        status: null,
      })
    }
  } catch (error) {
    console.error('Update subscription error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
