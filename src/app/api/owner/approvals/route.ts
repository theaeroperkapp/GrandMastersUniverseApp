import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, getApprovalEmail, getDenialEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  console.log('=== Approvals API called ===')
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyAdminClient = adminClient as any
    console.log('Clients created')

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
    const { user_id, action, school_id } = body
    console.log('Request body:', { user_id, action, school_id })

    if (!user_id || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the pending user
    console.log('Fetching pending user...')
    const { data: pendingUser, error: fetchError } = await anyAdminClient
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single()

    console.log('Fetch result:', { pendingUser, fetchError })
    if (fetchError) {
      console.error('Fetch pending user error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
    }

    const pendingUserData = pendingUser as { full_name: string; email: string; school_id: string | null } | null
    if (!pendingUserData) {
      console.log('User not found in database')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    console.log('Found user:', pendingUserData.full_name, pendingUserData.email)

    // Get school name separately
    let schoolName = 'your school'
    if (school_id) {
      const { data: school } = await anyAdminClient
        .from('schools')
        .select('name')
        .eq('id', school_id)
        .single()
      if (school) {
        schoolName = (school as { name: string }).name
      }
    }

    if (action === 'approve') {
      // Get the full user profile to check role
      const { data: fullProfile } = await anyAdminClient
        .from('profiles')
        .select('role')
        .eq('id', user_id)
        .single()

      const userRole = (fullProfile as { role: string } | null)?.role

      // If user is a parent, create a family for them
      let familyId: string | null = null
      if (userRole === 'parent') {
        // Create family name from user's last name or full name
        const nameParts = pendingUserData.full_name.split(' ')
        const familyName = nameParts.length > 1
          ? `${nameParts[nameParts.length - 1]} Family`
          : `${pendingUserData.full_name}'s Family`

        const { data: newFamily, error: familyError } = await anyAdminClient
          .from('families')
          .insert({
            school_id: school_id || pendingUserData.school_id,
            primary_holder_id: user_id,
            name: familyName,
            billing_email: pendingUserData.email,
          })
          .select('id')
          .single()

        if (familyError) {
          console.error('Family creation error:', familyError)
          // Don't fail the approval if family creation fails
        } else if (newFamily) {
          familyId = newFamily.id
        }
      }

      // Update user to approved and ensure school_id is set
      const updateData: Record<string, unknown> = {
        is_approved: true,
        school_id: school_id || pendingUserData.school_id
      }

      // Link parent to their new family
      if (familyId) {
        updateData.family_id = familyId
      }

      const { error: updateError } = await anyAdminClient
        .from('profiles')
        .update(updateData)
        .eq('id', user_id)

      if (updateError) {
        console.error('Approval error:', updateError)
        return NextResponse.json({ error: `Failed to approve user: ${updateError.message}` }, { status: 500 })
      }

      // Send approval email
      try {
        const emailContent = getApprovalEmail(pendingUserData.full_name, schoolName)
        await sendEmail({
          to: pendingUserData.email,
          subject: emailContent.subject,
          html: emailContent.html,
        })
      } catch (emailError) {
        console.error('Email error:', emailError)
        // Don't fail the request if email fails
      }

      // Create notification
      await anyAdminClient.from('notifications').insert({
        profile_id: user_id,
        type: 'approval',
        title: 'Account Approved',
        content: `Your account at ${schoolName} has been approved. Welcome!`,
      })

      return NextResponse.json({ success: true })
    } else if (action === 'deny') {
      // Send denial email first
      try {
        const emailContent = getDenialEmail(pendingUserData.full_name, schoolName)
        await sendEmail({
          to: pendingUserData.email,
          subject: emailContent.subject,
          html: emailContent.html,
        })
      } catch (emailError) {
        console.error('Email error:', emailError)
      }

      // Delete the profile
      const { error: deleteError } = await anyAdminClient
        .from('profiles')
        .delete()
        .eq('id', user_id)

      if (deleteError) {
        console.error('Delete error:', deleteError)
        return NextResponse.json({ error: `Failed to deny user: ${deleteError.message}` }, { status: 500 })
      }

      // Delete the auth user
      await anyAdminClient.auth.admin.deleteUser(user_id)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Approvals API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
