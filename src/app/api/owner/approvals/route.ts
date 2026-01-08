import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, getApprovalEmail, getDenialEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  console.log('=== Approvals API called ===')
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()
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
    const { data: pendingUser, error: fetchError } = await adminClient
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
      const { data: school } = await adminClient
        .from('schools')
        .select('name')
        .eq('id', school_id)
        .single()
      if (school) {
        schoolName = (school as { name: string }).name
      }
    }

    if (action === 'approve') {
      // Update user to approved and ensure school_id is set
      const { error: updateError } = await adminClient
        .from('profiles')
        .update({
          is_approved: true,
          school_id: school_id || pendingUserData.school_id
        })
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
      await adminClient.from('notifications').insert({
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
      const { error: deleteError } = await adminClient
        .from('profiles')
        .delete()
        .eq('id', user_id)

      if (deleteError) {
        console.error('Delete error:', deleteError)
        return NextResponse.json({ error: `Failed to deny user: ${deleteError.message}` }, { status: 500 })
      }

      // Delete the auth user
      await adminClient.auth.admin.deleteUser(user_id)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Approvals API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
