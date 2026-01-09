import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createConnectLoginLink } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile and school
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single()

    const profile = profileData as { role: string; school_id: string | null } | null

    if (!profile || profile.role !== 'owner') {
      return NextResponse.json({ error: 'Only school owners can access this' }, { status: 403 })
    }

    if (!profile.school_id) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 })
    }

    // Get school's Connect account ID
    const { data: schoolData } = await supabase
      .from('schools')
      .select('stripe_account_id')
      .eq('id', profile.school_id)
      .single()

    const school = schoolData as { stripe_account_id: string | null } | null

    if (!school?.stripe_account_id) {
      return NextResponse.json({ error: 'Payment account not set up' }, { status: 400 })
    }

    // Create login link
    const loginLink = await createConnectLoginLink(school.stripe_account_id)

    return NextResponse.json({ url: loginLink.url })
  } catch (error) {
    console.error('Connect dashboard error:', error)
    return NextResponse.json({ error: 'Failed to create dashboard link' }, { status: 500 })
  }
}
