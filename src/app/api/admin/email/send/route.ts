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

    // Check if user is platform admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: string } | null
    if (!profileData || profileData.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

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

    const results: { email: string; success: boolean; error?: string }[] = []

    // Send emails to each recipient
    for (const recipient of recipients) {
      // Replace placeholders in body
      const personalizedBody = emailBody
        .replace(/{name}/g, recipient.name)

      const html = generateAdminEmailHtml(subject, personalizedBody)

      const result = await sendEmail({
        to: recipient.email,
        subject: `${subject} - ${APP_NAME}`,
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
    console.error('Admin send email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateAdminEmailHtml(subject: string, body: string): string {
  // Convert newlines to <br> for HTML
  const formattedBody = body.replace(/\n/g, '<br>')

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #3b82f6;">
        <h1 style="color: #3b82f6; margin: 0; font-size: 24px;">${APP_NAME}</h1>
        <p style="color: #666; margin-top: 5px; font-size: 14px;">Platform Administration</p>
      </div>

      <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="color: #111; margin-top: 0; font-size: 20px;">${subject}</h2>
        <div style="color: #374151; line-height: 1.8; font-size: 15px;">
          ${formattedBody}
        </div>
      </div>

      <div style="text-align: center; color: #9ca3af; font-size: 12px; padding-top: 20px; margin-top: 30px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 5px 0;">${APP_NAME} Platform Team</p>
        <p style="margin: 5px 0;">This is an official communication from ${APP_NAME}</p>
      </div>
    </div>
  `
}
