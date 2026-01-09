import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null }

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { schoolId, subscriptionPlan, trialEndDate, billingDay } = await request.json()

    if (!schoolId || !subscriptionPlan) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate subscription plan
    const validPlans = ['founding_partner', 'standard', 'trial']
    if (!validPlans.includes(subscriptionPlan)) {
      return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 })
    }

    // Validate billing day if provided
    if (billingDay !== undefined && billingDay !== null) {
      const day = parseInt(billingDay, 10)
      if (isNaN(day) || day < 1 || day > 28) {
        return NextResponse.json({ error: 'Billing day must be between 1 and 28' }, { status: 400 })
      }
    }

    const adminClient = createAdminClient()

    // Calculate subscription status based on plan
    let subscriptionStatus = 'active'
    let trialEndsAt = null

    switch (subscriptionPlan) {
      case 'founding_partner':
        subscriptionStatus = 'active'
        break
      case 'standard':
        subscriptionStatus = 'active'
        break
      case 'trial':
        subscriptionStatus = 'trial'
        // If trial end date provided, use it, otherwise default to 30 days
        if (trialEndDate) {
          trialEndsAt = new Date(trialEndDate).toISOString()
        } else {
          const defaultTrialEnd = new Date()
          defaultTrialEnd.setDate(defaultTrialEnd.getDate() + 30)
          trialEndsAt = defaultTrialEnd.toISOString()
        }
        break
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      subscription_plan: subscriptionPlan,
      subscription_status: subscriptionStatus,
      trial_ends_at: trialEndsAt,
      updated_at: new Date().toISOString(),
    }

    // Include billing_day if provided
    if (billingDay !== undefined && billingDay !== null) {
      updateData.billing_day = parseInt(billingDay, 10)
    }

    // Update school subscription
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient as any)
      .from('schools')
      .update(updateData)
      .eq('id', schoolId)

    if (error) {
      console.error('Error updating subscription:', error)
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating subscription:', error)
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
  }
}
