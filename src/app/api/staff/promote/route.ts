import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, getStaffPromotionEmail } from '@/lib/email'

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
      return NextResponse.json({ error: 'Only owners can promote members' }, { status: 403 })
    }

    if (!profileData.school_id) {
      return NextResponse.json({ error: 'No school associated with this account' }, { status: 400 })
    }

    const body = await request.json()
    const { member_id, role, sub_roles, school_id } = body

    if (!member_id || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the school_id matches the user's school
    if (school_id !== profileData.school_id) {
      return NextResponse.json({ error: 'School ID mismatch' }, { status: 403 })
    }

    // Get the member being promoted
    const { data: memberData } = await (adminClient as ReturnType<typeof createAdminClient>)
      .from('profiles')
      .select('id, full_name, email, role, school_id')
      .eq('id', member_id)
      .single()

    const member = memberData as { id: string; full_name: string; email: string; role: string; school_id: string | null } | null

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Verify member is in the same school
    if (member.school_id !== school_id) {
      return NextResponse.json({ error: 'Member is not in your school' }, { status: 403 })
    }

    // Get school name
    const { data: schoolData } = await supabase
      .from('schools')
      .select('name')
      .eq('id', school_id)
      .single()

    const school = schoolData as { name: string } | null
    const schoolName = school?.name || 'the school'
    const roleName = role === 'admin' ? 'Admin' : 'Instructor'

    // Update the member's role
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (adminClient.from('profiles') as any)
      .update({
        role: role,
        sub_roles: sub_roles || [],
      })
      .eq('id', member_id)

    if (updateError) {
      console.error('Error updating member role:', updateError)
      return NextResponse.json({
        error: `Failed to update member role: ${updateError.message}`
      }, { status: 500 })
    }

    // Create in-app notification for the promoted member
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: notificationError } = await (adminClient.from('notifications') as any)
      .insert({
        profile_id: member_id,
        type: 'promotion',
        title: 'You have been promoted!',
        content: `Congratulations! You have been promoted to ${roleName} at ${schoolName}. You now have access to additional features.`,
      })

    if (notificationError) {
      console.warn('Failed to create notification:', notificationError)
      // Don't fail the request if notification fails
    }

    // Send email notification
    if (member.email) {
      const { subject, html } = getStaffPromotionEmail(
        member.full_name || 'Team Member',
        schoolName,
        roleName
      )

      const emailResult = await sendEmail({ to: member.email, subject, html })

      if (!emailResult.success) {
        console.warn('Email not sent:', emailResult.reason)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `${member.full_name || 'Member'} has been promoted to ${roleName}`,
    })

  } catch (error) {
    console.error('Staff promote error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
