import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PATCH - Update member's role (student <-> parent)
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

    const { role } = await request.json()

    if (!role || !['student', 'parent'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be "student" or "parent"' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyAdminClient = adminClient as any

    // Check if target profile belongs to the same school
    const { data: targetProfile } = await anyAdminClient
      .from('profiles')
      .select('id, school_id, role')
      .eq('id', id)
      .single() as { data: { id: string; school_id: string; role: string } | null }

    if (!targetProfile || targetProfile.school_id !== profileData.school_id) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Update the role
    const { error: updateError } = await anyAdminClient
      .from('profiles')
      .update({ role })
      .eq('id', id)

    if (updateError) {
      console.error('Update role error:', updateError)
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    // If changing to student, create student_profile if it doesn't exist
    if (role === 'student') {
      const { data: existingStudentProfile } = await anyAdminClient
        .from('student_profiles')
        .select('id')
        .eq('profile_id', id)
        .single()

      if (!existingStudentProfile) {
        await anyAdminClient
          .from('student_profiles')
          .insert({
            profile_id: id,
            school_id: profileData.school_id,
            enrollment_date: new Date().toISOString().split('T')[0],
          })
      }
    }

    return NextResponse.json({
      success: true,
      role,
    })
  } catch (error) {
    console.error('Update role error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
