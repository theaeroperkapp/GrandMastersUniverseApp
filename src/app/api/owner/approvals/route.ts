import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, getApprovalEmail, getDenialEmail } from '@/lib/email'

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

    const { user_id, action, school_id } = await request.json()

    if (!user_id || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the pending user
    const { data: pendingUser } = await (adminClient as any)
      .from('profiles')
      .select('*, schools(name)')
      .eq('id', user_id)
      .eq('school_id', school_id)
      .single()

    const pendingUserData = pendingUser as { full_name: string; email: string; schools: { name: string } | null } | null
    if (!pendingUserData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const schoolName = pendingUserData.schools?.name || 'your school'

    if (action === 'approve') {
      // Update user to approved
      const { error: updateError } = await (adminClient as any)
        .from('profiles')
        .update({ is_approved: true })
        .eq('id', user_id)

      if (updateError) {
        console.error('Approval error:', updateError)
        return NextResponse.json({ error: 'Failed to approve user' }, { status: 500 })
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
      await (adminClient as any).from('notifications').insert({
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
      const { error: deleteError } = await (adminClient as any)
        .from('profiles')
        .delete()
        .eq('id', user_id)

      if (deleteError) {
        console.error('Delete error:', deleteError)
        return NextResponse.json({ error: 'Failed to deny user' }, { status: 500 })
      }

      // Delete the auth user
      await (adminClient as any).auth.admin.deleteUser(user_id)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Approvals API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
