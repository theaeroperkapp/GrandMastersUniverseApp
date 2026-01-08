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
    const { full_name, email, role, belt_rank_id, family_id, school_id } = body

    if (!full_name?.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    }

    // Use provided school_id or user's school_id
    const targetSchoolId = school_id || profileData.school_id
    if (!targetSchoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 })
    }

    // Create profile for the new student (without auth user)
    const { data: newProfile, error: profileError } = await (adminClient as any)
      .from('profiles')
      .insert({
        id: crypto.randomUUID(),
        full_name: full_name.trim(),
        email: email?.trim() || null,
        role: role || 'student',
        school_id: targetSchoolId,
        family_id: family_id || null,
        is_approved: true,
        is_student: role === 'student',
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      return NextResponse.json({ error: 'Failed to create student profile' }, { status: 500 })
    }

    // If student role and belt_rank_id provided, create student_profile
    if (role === 'student' && belt_rank_id) {
      const { error: studentProfileError } = await (adminClient as any)
        .from('student_profiles')
        .insert({
          profile_id: newProfile.id,
          school_id: targetSchoolId,
          belt_rank_id: belt_rank_id,
          enrollment_date: new Date().toISOString().split('T')[0],
        })

      if (studentProfileError) {
        console.error('Student profile creation error:', studentProfileError)
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json(newProfile, { status: 201 })
  } catch (error) {
    console.error('Add student error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
