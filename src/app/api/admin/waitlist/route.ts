import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, getWaitlistApprovalEmail, getWaitlistRejectionEmail } from '@/lib/email'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: string } | null
    if (profileData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id, status, notes, sendNotification } = await request.json()

    if (!id || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Get waitlist entry
    const { data: entry } = await supabase
      .from('waitlist')
      .select('*')
      .eq('id', id)
      .single()

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // Update status
    const { error: updateError } = await supabase
      .from('waitlist')
      .update({
        status,
        notes: notes || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      } as never)
      .eq('id', id)

    if (updateError) {
      console.error('Waitlist update error:', updateError)
      return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 })
    }

    // Send email notification if requested
    let emailSent = false
    if (sendNotification) {
      const entryData = entry as { name: string; email: string; school_name: string }
      const emailTemplate = status === 'approved'
        ? getWaitlistApprovalEmail(entryData.name, entryData.school_name)
        : getWaitlistRejectionEmail(entryData.name, entryData.school_name)

      const result = await sendEmail({
        to: entryData.email,
        ...emailTemplate,
      })

      emailSent = result.success
    }

    return NextResponse.json({
      success: true,
      emailSent,
    })
  } catch (error) {
    console.error('Waitlist API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
