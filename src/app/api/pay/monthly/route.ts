import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createCustomer,
  createPaymentIntent,
  confirmPaymentIntent,
} from '@/lib/stripe'
import { createPaymentNotification } from '@/lib/notifications'

// Manual monthly payment for schools without automated Stripe subscription
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
      return NextResponse.json({ error: 'Only school owners can make payments' }, { status: 403 })
    }

    // Get school
    const { data: school } = await adminClient
      .from('schools')
      .select('id, stripe_customer_id, name, billing_day')
      .eq('id', profile.school_id)
      .single() as { data: { id: string; stripe_customer_id: string | null; name: string; billing_day: number | null } | null }

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
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

    const amount = 9900 // $99.00 in cents
    const now = new Date()

    // Calculate billing period
    const billingDay = school.billing_day || now.getDate()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), billingDay)
    if (periodStart > now) {
      periodStart.setMonth(periodStart.getMonth() - 1)
    }
    const periodEnd = new Date(periodStart)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    try {
      // Create and confirm payment intent
      const paymentIntent = await createPaymentIntent(
        amount,
        'usd',
        customerId,
        {
          type: 'monthly_subscription',
          school_id: school.id,
          user_id: user.id,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
        }
      )

      // Confirm the payment with the payment method
      const confirmedPayment = await confirmPaymentIntent(
        paymentIntent.id,
        payment_method_id
      )

      if (confirmedPayment.status === 'succeeded') {
        // Record the payment (amount in dollars for DECIMAL column)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insertError } = await (adminClient as any)
          .from('platform_payments')
          .insert({
            school_id: school.id,
            amount: amount / 100, // Convert cents to dollars
            payment_type: 'subscription',
            status: 'succeeded',
            description: `Monthly subscription - ${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}`,
            payment_method: 'card',
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: confirmedPayment.id,
            period_start: periodStart.toISOString(),
            period_end: periodEnd.toISOString(),
          })

        if (insertError) {
          console.error('Error recording payment:', insertError)
        }

        // Update school status to active
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (adminClient as any)
          .from('schools')
          .update({
            subscription_status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', school.id)

        // Create success notification
        await createPaymentNotification({
          userId: user.id,
          success: true,
          amount: amount,
          description: 'Monthly subscription payment',
          relatedId: school.id,
        })

        return NextResponse.json({
          success: true,
          payment_intent_id: confirmedPayment.id,
          status: 'succeeded',
        })
      }

      if (confirmedPayment.status === 'requires_action') {
        return NextResponse.json({
          requires_action: true,
          client_secret: confirmedPayment.client_secret,
          payment_intent_id: confirmedPayment.id,
        })
      }

      throw new Error('Payment was not successful')
    } catch (error: unknown) {
      const stripeError = error as { message?: string }
      console.error('Payment failed:', error)

      // Create failure notification
      await createPaymentNotification({
        userId: user.id,
        success: false,
        amount: amount,
        description: 'Monthly subscription payment',
        relatedId: school.id,
      })

      return NextResponse.json(
        { error: stripeError.message || 'Payment failed' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error processing monthly payment:', error)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}
