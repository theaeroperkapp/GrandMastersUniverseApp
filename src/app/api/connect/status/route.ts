import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getConnectAccount } from '@/lib/stripe'

export async function GET(request: NextRequest) {
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
      return NextResponse.json({ error: 'Only school owners can view this' }, { status: 403 })
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
      return NextResponse.json({
        connected: false,
        status: 'not_created',
        message: 'Payment account not set up',
      })
    }

    // Get account details from Stripe
    const account = await getConnectAccount(school.stripe_account_id)

    return NextResponse.json({
      connected: account.charges_enabled && account.payouts_enabled,
      status: account.charges_enabled && account.payouts_enabled ? 'active' : 'pending',
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      requirements: account.requirements,
    })
  } catch (error) {
    console.error('Connect status error:', error)
    return NextResponse.json({ error: 'Failed to get account status' }, { status: 500 })
  }
}
