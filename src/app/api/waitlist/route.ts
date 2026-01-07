import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const adminClient = createAdminClient()
    const { name, email, school_name, phone } = await request.json()

    if (!name || !email || !school_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if email already exists
    const { data: existing } = await (adminClient as any)
      .from('waitlist')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Email already on waitlist' }, { status: 400 })
    }

    const { error } = await (adminClient as any).from('waitlist').insert({
      name,
      email,
      school_name,
      phone,
    })

    if (error) {
      console.error('Waitlist error:', error)
      return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Waitlist API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
