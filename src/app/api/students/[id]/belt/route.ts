import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PATCH - Update student's belt rank
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

    const { belt_rank_id } = await request.json()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyAdminClient = adminClient as any

    // Check if student profile exists
    let { data: studentProfile } = await anyAdminClient
      .from('student_profiles')
      .select('id')
      .eq('profile_id', id)
      .eq('school_id', profileData.school_id)
      .single() as { data: { id: string } | null }

    // If no student profile exists, create one
    if (!studentProfile) {
      const { data: newProfile, error: createError } = await anyAdminClient
        .from('student_profiles')
        .insert({
          profile_id: id,
          school_id: profileData.school_id,
        })
        .select('id')
        .single() as { data: { id: string } | null; error: unknown }

      if (createError) {
        console.error('Create student profile error:', createError)
        return NextResponse.json({ error: 'Failed to create student profile' }, { status: 500 })
      }
      studentProfile = newProfile
    }

    // Update belt rank
    const { data: updatedProfile, error: updateError } = await anyAdminClient
      .from('student_profiles')
      .update({ belt_rank_id: belt_rank_id || null })
      .eq('id', studentProfile!.id)
      .select('id, belt_rank_id')
      .single()

    if (updateError) {
      console.error('Update belt error:', updateError)
      return NextResponse.json({ error: 'Failed to update belt rank' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      studentProfileId: updatedProfile?.id,
      belt_rank_id: updatedProfile?.belt_rank_id,
    })
  } catch (error) {
    console.error('Update belt error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
