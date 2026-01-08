import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createCustomer,
  createSubscriptionWithPaymentMethod,
  attachPaymentMethod,
  setDefaultPaymentMethod,
} from '@/lib/stripe'
import { createPaymentNotification } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { payment_method_id } = body

    if (!payment_method_id) {
      return NextResponse.json(
        { error: 'Payment method required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Get user profile and verify owner role
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role, school_id, email')
      .eq('id', user.id)
      .single() as { data: { role: string; school_id: string | null; email: string | null } | null }

    if (!profile || profile.role !== 'owner' || !profile.school_id) {
      return NextResponse.json({ error: 'Only school owners can subscribe' }, { status: 403 })
    }

    // Get school
    const { data: school } = await adminClient
      .from('schools')
      .select('id, stripe_customer_id, name, stripe_subscription_id, subscription_status')
      .eq('id', profile.school_id)
      .single() as { data: { id: string; stripe_customer_id: string | null; name: string; stripe_subscription_id: string | null; subscription_status: string | null } | null }

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    // Check if already has active subscription
    if (school.stripe_subscription_id && school.subscription_status === 'active') {
      return NextResponse.json(
        { error: 'School already has an active subscription' },
        { status: 400 }
      )
    }

    // Get or create Stripe customer
    let customerId = school.stripe_customer_id
    if (!customerId) {
      const customer = await createCustomer(
        profile.email || user.email || '',
        school.name,
        { school_id: school.id, type: 'school' }
      )
      customerId = customer.id

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from('schools')
        .update({ stripe_customer_id: customerId })
        .eq('id', school.id)
    }

    // Attach payment method and set as default
    try {
      await attachPaymentMethod(payment_method_id, customerId)
    } catch {
      // Payment method might already be attached
    }
    await setDefaultPaymentMethod(customerId, payment_method_id)

    const priceId = process.env.STRIPE_PRICE_ID
    if (!priceId) {
      return NextResponse.json(
        { error: 'Subscription price not configured' },
        { status: 500 }
      )
    }

    // Create subscription with 30-day trial
    try {
      const subscription = await createSubscriptionWithPaymentMethod(
        customerId,
        priceId,
        payment_method_id,
        30 // 30 day trial
      )

      // Update school with subscription info
      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + 30)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from('schools')
        .update({
          stripe_subscription_id: subscription.id,
          subscription_status: 'trialing',
          trial_ends_at: trialEnd.toISOString(),
        })
        .eq('id', school.id)

      // Create notification
      await createPaymentNotification({
        userId: user.id,
        success: true,
        amount: 9900, // $99.00
        description: 'Platform Subscription (30-day trial started)',
        relatedId: school.id,
      })

      return NextResponse.json({
        success: true,
        subscription_id: subscription.id,
        status: subscription.status,
        trial_end: trialEnd.toISOString(),
      })
    } catch (error: unknown) {
      const stripeError = error as { message?: string }
      console.error('Subscription creation failed:', error)

      // Create failure notification
      await createPaymentNotification({
        userId: user.id,
        success: false,
        amount: 9900,
        description: 'Platform Subscription',
        relatedId: school.id,
      })

      return NextResponse.json(
        { error: stripeError.message || 'Failed to create subscription' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error processing subscription:', error)
    return NextResponse.json(
      { error: 'Failed to process subscription' },
      { status: 500 }
    )
  }
}
