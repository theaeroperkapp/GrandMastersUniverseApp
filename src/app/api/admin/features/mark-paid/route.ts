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

    const { schoolId, featureCode, paymentNote } = await request.json()

    if (!schoolId || !featureCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get current subscription
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subscription } = await (adminClient as any)
      .from('school_feature_subscriptions')
      .select('*')
      .eq('school_id', schoolId)
      .eq('feature_code', featureCode)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Calculate payment amount
    const amount = subscription.monthly_fee || subscription.one_time_fee || 0

    // Record payment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('platform_payments')
      .insert({
        school_id: schoolId,
        feature_code: featureCode,
        amount,
        payment_type: subscription.one_time_fee ? 'one_time' : 'manual',
        status: 'succeeded',
        description: `Manual payment for ${featureCode}`,
        payment_method: 'manual',
        paid_at: new Date().toISOString(),
        recorded_by: user.id,
        notes: paymentNote || null,
      })

    // Calculate next billing date (1 month from now for monthly)
    let nextBillingDate = null
    if (subscription.pricing_model === 'standard' && subscription.monthly_fee > 0) {
      nextBillingDate = new Date()
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
    }

    // Update subscription status to active
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('school_feature_subscriptions')
      .update({
        status: 'active',
        next_billing_date: nextBillingDate?.toISOString() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('school_id', schoolId)
      .eq('feature_code', featureCode)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking as paid:', error)
    return NextResponse.json({ error: 'Failed to mark as paid' }, { status: 500 })
  }
}
