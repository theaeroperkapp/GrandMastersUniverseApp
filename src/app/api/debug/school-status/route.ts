import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Debug endpoint to check school subscription status
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user's profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single()

    const profile = profileData as { role: string; school_id: string | null } | null

    if (!profile?.school_id) {
      return NextResponse.json({ error: 'No school found' }, { status: 404 })
    }

    // Get school info
    const { data: schoolData } = await supabase
      .from('schools')
      .select('id, name, subscription_plan, subscription_status, billing_day, trial_ends_at, created_at')
      .eq('id', profile.school_id)
      .single()

    const school = schoolData as {
      id: string
      name: string
      subscription_plan: string | null
      subscription_status: string | null
      billing_day: number | null
      trial_ends_at: string | null
      created_at: string | null
    } | null

    const now = new Date()
    const currentDay = now.getDate()
    const billingDay = school?.billing_day

    const analysis = {
      currentDay,
      billingDay,
      isPastBillingDay: billingDay ? currentDay > billingDay : false,
      daysOverdue: billingDay && currentDay > billingDay ? currentDay - billingDay : 0,
      shouldShowWarning: false,
      reason: '',
    }

    // Check warning conditions
    if (school?.subscription_status === 'past_due') {
      analysis.shouldShowWarning = true
      analysis.reason = 'Status is past_due'
    } else if (school?.subscription_plan === 'standard' && billingDay && currentDay > billingDay && school?.subscription_status !== 'active') {
      analysis.shouldShowWarning = true
      analysis.reason = 'Past billing day with non-active status'
    } else if (school?.subscription_plan === 'standard' && billingDay && currentDay > billingDay && school?.subscription_status === 'active') {
      analysis.shouldShowWarning = false
      analysis.reason = 'Past billing day BUT status is active - set status to past_due to show warning'
    } else if (school?.subscription_plan !== 'standard') {
      analysis.reason = `subscription_plan is "${school?.subscription_plan}" (need "standard" for billing warnings)`
    } else if (!billingDay) {
      analysis.reason = 'No billing_day set'
    } else {
      analysis.reason = 'Not past billing day yet'
    }

    // Get latest payment using admin client
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminClient = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: latestPayment, error: paymentError } = await (adminClient as any)
      .from('platform_payments')
      .select('*')
      .eq('school_id', profile.school_id)
      .order('paid_at', { ascending: false })
      .limit(3)

    return NextResponse.json({
      school,
      analysis,
      latestPayments: latestPayment || [],
      paymentError: paymentError?.message || null,
      suggestion: analysis.shouldShowWarning
        ? 'Warning should be visible on /owner/subscription page'
        : 'To test the warning, update subscription_status to "past_due" via admin panel',
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}
