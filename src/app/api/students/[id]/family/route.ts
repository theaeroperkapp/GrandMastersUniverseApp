import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PATCH - Assign student to a family
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const adminClient = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyAdminClient = adminClient as any

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

    const { family_id } = await request.json()

    // If family_id is provided, verify it belongs to this school
    if (family_id) {
      const { data: family } = await anyAdminClient
        .from('families')
        .select('id')
        .eq('id', family_id)
        .eq('school_id', profileData.school_id)
        .single()

      if (!family) {
        return NextResponse.json({ error: 'Family not found' }, { status: 404 })
      }
    }

    // Update the profile's family_id
    const { error: updateError } = await anyAdminClient
      .from('profiles')
      .update({ family_id: family_id || null })
      .eq('id', id)
      .eq('school_id', profileData.school_id)

    if (updateError) {
      console.error('Update family error:', updateError)
      return NextResponse.json({ error: 'Failed to update family' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      family_id: family_id || null,
    })
  } catch (error) {
    console.error('Update family error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
