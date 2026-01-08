import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Generate a random 6-digit PIN
function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// GET - Get student's current PIN
export async function GET(
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

    // Get student profile with PIN (use admin client for RLS bypass)
    const { data: studentProfile } = await anyAdminClient
      .from('student_profiles')
      .select('id, pin_code, profile_id')
      .eq('profile_id', id)
      .eq('school_id', profileData.school_id)
      .single()

    return NextResponse.json({
      studentProfileId: studentProfile?.id || null,
      pin: studentProfile?.pin_code || null,
    })
  } catch (error) {
    console.error('Get PIN error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Generate PIN for a student (only if they don't have one)
export async function POST(
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

    // Check if student profile exists
    let { data: studentProfile } = await anyAdminClient
      .from('student_profiles')
      .select('id, pin_code')
      .eq('profile_id', id)
      .eq('school_id', profileData.school_id)
      .single() as { data: { id: string; pin_code: string | null } | null }

    // If no student profile exists, create one
    if (!studentProfile) {
      const { data: newProfile, error: createError } = await anyAdminClient
        .from('student_profiles')
        .insert({
          profile_id: id,
          school_id: profileData.school_id,
        })
        .select('id, pin_code')
        .single() as { data: { id: string; pin_code: string | null } | null; error: unknown }

      if (createError) {
        console.error('Create student profile error:', createError)
        return NextResponse.json({ error: 'Failed to create student profile' }, { status: 500 })
      }
      studentProfile = newProfile
    }

    // If student already has a PIN, return it (don't regenerate)
    if (studentProfile?.pin_code) {
      return NextResponse.json({
        success: true,
        studentProfileId: studentProfile.id,
        pin: studentProfile.pin_code,
        alreadyExists: true,
      })
    }

    // Generate a unique PIN
    let newPin: string = ''
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      newPin = generatePin()

      // Check if PIN is unique for this school
      const { data: existing } = await anyAdminClient
        .from('student_profiles')
        .select('id')
        .eq('school_id', profileData.school_id)
        .eq('pin_code', newPin)
        .single()

      if (!existing) {
        break
      }
      attempts++
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json({ error: 'Failed to generate unique PIN' }, { status: 500 })
    }

    // Update student profile with new PIN
    const { data: updatedProfile, error: updateError } = await anyAdminClient
      .from('student_profiles')
      .update({ pin_code: newPin })
      .eq('id', studentProfile!.id)
      .select('id, pin_code')
      .single()

    if (updateError) {
      console.error('Update PIN error:', updateError)
      return NextResponse.json({ error: 'Failed to update PIN' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      studentProfileId: updatedProfile?.id,
      pin: updatedProfile?.pin_code,
      alreadyExists: false,
    })
  } catch (error) {
    console.error('Generate PIN error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
