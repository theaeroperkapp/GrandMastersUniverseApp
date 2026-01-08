import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ approved: false, error: 'Email required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Check if email exists in waitlist with approved status
    const { data: waitlistEntry, error } = await adminClient
      .from('waitlist')
      .select('id, status, school_name')
      .eq('email', email.toLowerCase())
      .eq('status', 'approved')
      .single()

    if (error || !waitlistEntry) {
      return NextResponse.json({
        approved: false,
        error: 'This email has not been approved. Please apply through the waitlist first.'
      })
    }

    const entry = waitlistEntry as { id: string; status: string; school_name: string }

    return NextResponse.json({
      approved: true,
      schoolName: entry.school_name
    })
  } catch (error) {
    console.error('Verify approval error:', error)
    return NextResponse.json({ approved: false, error: 'Verification failed' }, { status: 500 })
  }
}
