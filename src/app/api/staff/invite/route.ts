import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, getStaffInvitationEmail } from '@/lib/email'
import { APP_URL } from '@/lib/constants'

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
      return NextResponse.json({ error: 'Only owners can invite staff' }, { status: 403 })
    }

    if (!profileData.school_id) {
      return NextResponse.json({ error: 'No school associated with this account' }, { status: 400 })
    }

    const body = await request.json()
    const { email, full_name, role, sub_roles, school_id } = body

    if (!email || !full_name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the school_id matches the user's school
    if (school_id !== profileData.school_id) {
      return NextResponse.json({ error: 'School ID mismatch' }, { status: 403 })
    }

    // Check if user with this email already exists
    const { data: existingUserData } = await (adminClient as ReturnType<typeof createAdminClient>)
      .from('profiles')
      .select('id, school_id')
      .eq('email', email.toLowerCase())
      .single()

    const existingUser = existingUserData as { id: string; school_id: string | null } | null

    if (existingUser) {
      // User exists - check if they're already in this school
      if (existingUser.school_id === school_id) {
        return NextResponse.json({ error: 'This user is already a member of your school' }, { status: 400 })
      }

      // Update their school and role
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (adminClient.from('profiles') as any)
        .update({
          school_id: school_id,
          role: role,
          sub_roles: sub_roles || [],
          is_approved: true,
        })
        .eq('id', existingUser.id)

      if (updateError) {
        console.error('Error updating existing user:', updateError)
        return NextResponse.json({ error: 'Failed to add existing user to school' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Existing user added to your school as staff'
      })
    }

    // Get school name for the email
    const { data: schoolData } = await supabase
      .from('schools')
      .select('name')
      .eq('id', school_id)
      .single()

    const school = schoolData as { name: string } | null
    const schoolName = school?.name || 'the school'

    // Generate a unique invite token
    const inviteToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // Store the invitation in a staff_invitations table (or we can use a simple approach)
    // For now, let's use a simple approach: create the profile with a pending status
    // and send them an email with a signup link

    // Create invite link with pre-filled data
    const inviteParams = new URLSearchParams({
      invite: inviteToken,
      email: email,
      name: full_name,
      role: role,
      school_id: school_id,
      sub_roles: JSON.stringify(sub_roles || []),
    })

    const inviteLink = `${APP_URL}/signup/staff?${inviteParams.toString()}`

    // Send invitation email
    const { subject, html } = getStaffInvitationEmail(
      full_name,
      schoolName,
      role === 'admin' ? 'Admin' : 'Instructor',
      inviteLink
    )

    const emailResult = await sendEmail({ to: email, subject, html })

    if (!emailResult.success) {
      console.warn('Email not sent:', emailResult.reason)
      // Still return success - the invite link works even if email fails
    }

    return NextResponse.json({
      success: true,
      message: emailResult.success
        ? 'Invitation sent successfully!'
        : 'Invitation created (email not configured)',
      inviteLink: !emailResult.success ? inviteLink : undefined, // Return link if email failed
    })

  } catch (error) {
    console.error('Staff invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
