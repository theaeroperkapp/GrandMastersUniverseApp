import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, getNewMemberNotificationEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { userId, schoolId, memberName, memberEmail, memberRole } = await request.json()

    if (!schoolId || !memberName || !memberEmail || !memberRole) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get the school info
    const { data: school, error: schoolError } = await adminClient
      .from('schools')
      .select('name')
      .eq('id', schoolId)
      .single()

    if (schoolError || !school) {
      console.error('School not found:', schoolError)
      return NextResponse.json({ success: false, error: 'School not found' }, { status: 404 })
    }

    const schoolData = school as { name: string }

    // Get the school owner's profile
    const { data: ownerProfile, error: ownerError } = await adminClient
      .from('profiles')
      .select('id, email, full_name')
      .eq('school_id', schoolId)
      .eq('role', 'owner')
      .single()

    if (ownerError || !ownerProfile) {
      console.error('Owner not found:', ownerError)
      return NextResponse.json({ success: false, error: 'Owner not found' }, { status: 404 })
    }

    const owner = ownerProfile as { id: string; email: string; full_name: string }

    // Send notification email to owner
    const emailContent = getNewMemberNotificationEmail(
      owner.full_name,
      memberName,
      memberEmail,
      memberRole,
      schoolData.name
    )

    const emailResult = await sendEmail({
      to: owner.email,
      subject: emailContent.subject,
      html: emailContent.html,
    })

    if (!emailResult.success) {
      console.error('Failed to send notification email:', emailResult.reason)
      // Don't fail the request - the signup was successful, email is just a notification
    }

    // Also create a notification in the database for the owner
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any).from('notifications').insert({
      user_id: owner.id,
      type: 'approval',
      title: 'New Member Request',
      message: `${memberName} (${memberRole}) has requested to join your school.`,
      is_read: false,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notify signup error:', error)
    return NextResponse.json({ success: false, error: 'Notification failed' }, { status: 500 })
  }
}
