import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 requests per 15 minutes per IP
    const clientIp = getClientIp(request)
    const rateLimitResult = rateLimit(`waitlist:${clientIp}`, {
      limit: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
    })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const adminClient = createAdminClient()
    const { name, email, school_name, phone } = await request.json()

    // Validate required fields
    if (!name || !email || !school_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate name length
    if (name.length < 2 || name.length > 100) {
      return NextResponse.json({ error: 'Name must be between 2 and 100 characters' }, { status: 400 })
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Validate school name length
    if (school_name.length < 2 || school_name.length > 200) {
      return NextResponse.json({ error: 'School name must be between 2 and 200 characters' }, { status: 400 })
    }

    // Sanitize inputs (trim whitespace)
    const sanitizedName = name.trim()
    const sanitizedEmail = email.trim().toLowerCase()
    const sanitizedSchoolName = school_name.trim()
    const sanitizedPhone = phone?.trim() || null

    // Check if email already exists
    const { data: existing } = await (adminClient as any)
      .from('waitlist')
      .select('id')
      .eq('email', sanitizedEmail)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Email already on waitlist' }, { status: 400 })
    }

    const { error } = await (adminClient as any).from('waitlist').insert({
      name: sanitizedName,
      email: sanitizedEmail,
      school_name: sanitizedSchoolName,
      phone: sanitizedPhone,
    })

    if (error) {
      console.error('Waitlist error:', error)
      return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
    }

    // Create notifications for all admins
    const { data: admins } = await (adminClient as any)
      .from('profiles')
      .select('id')
      .eq('role', 'admin')

    if (admins && admins.length > 0) {
      const notifications = admins.map((admin: { id: string }) => ({
        user_id: admin.id,
        title: 'New Waitlist Entry',
        message: `${sanitizedName} from ${sanitizedSchoolName} has joined the waitlist.`,
        type: 'info',
      }))

      await (adminClient as any).from('notifications').insert(notifications)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Waitlist API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
