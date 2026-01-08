import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { APP_NAME } from '@/lib/constants'

interface Recipient {
  email: string
  name: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is owner or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, school_id, full_name')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: string; school_id: string | null; full_name: string } | null
    if (!profileData || (profileData.role !== 'owner' && profileData.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!profileData.school_id) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 })
    }

    // Get school name
    const { data: school } = await supabase
      .from('schools')
      .select('name')
      .eq('id', profileData.school_id)
      .single()

    const schoolData = school as { name: string } | null

    const body = await request.json()
    const { recipients, subject, body: emailBody } = body as {
      recipients: Recipient[]
      subject: string
      body: string
    }

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients specified' }, { status: 400 })
    }

    if (!subject?.trim() || !emailBody?.trim()) {
      return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 })
    }

    // Rate limiting: max 100 emails per request
    if (recipients.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 recipients per request' }, { status: 400 })
    }

    const schoolName = schoolData?.name || 'Your School'
    const results: { email: string; success: boolean; error?: string }[] = []

    // Send emails to each recipient
    for (const recipient of recipients) {
      // Replace placeholders in body
      const personalizedBody = emailBody
        .replace(/{name}/g, recipient.name)
        .replace(/{school}/g, schoolName)

      const html = generateEmailHtml(subject, personalizedBody, schoolName)

      const result = await sendEmail({
        to: recipient.email,
        subject: `${subject} - ${schoolName}`,
        html,
      })

      results.push({
        email: recipient.email,
        success: result.success,
        error: result.reason,
      })
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failCount,
      results,
    })
  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateEmailHtml(subject: string, body: string, schoolName: string): string {
  // Convert newlines to <br> for HTML
  const formattedBody = body.replace(/\n/g, '<br>')

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #dc2626;">
        <h1 style="color: #dc2626; margin: 0; font-size: 24px;">${schoolName}</h1>
        <p style="color: #666; margin-top: 5px; font-size: 14px;">via ${APP_NAME}</p>
      </div>

      <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="color: #111; margin-top: 0; font-size: 20px;">${subject}</h2>
        <div style="color: #374151; line-height: 1.8; font-size: 15px;">
          ${formattedBody}
        </div>
      </div>

      <div style="text-align: center; color: #9ca3af; font-size: 12px; padding-top: 20px; margin-top: 30px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 5px 0;">Sent from ${schoolName}</p>
        <p style="margin: 5px 0;">Powered by ${APP_NAME}</p>
      </div>
    </div>
  `
}
