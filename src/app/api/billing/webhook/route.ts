import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { constructWebhookEvent } from '@/lib/stripe'
import Stripe from 'stripe'

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

interface SubscriptionWithPeriod extends Stripe.Subscription {
  current_period_end: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = constructWebhookEvent(body, signature, WEBHOOK_SECRET)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Check if this is an event registration payment
        if (session.metadata?.type === 'event_registration') {
          const registrationId = session.metadata?.registration_id
          if (registrationId) {
            // Update the registration payment status to paid
            await (adminClient as any)
              .from('event_registrations')
              .update({
                payment_status: 'paid',
                payment_intent_id: session.payment_intent as string,
              })
              .eq('id', registrationId)
          }
          break
        }

        // Otherwise handle subscription checkout
        const schoolId = session.metadata?.school_id
        if (schoolId && session.subscription) {
          await (adminClient as any)
            .from('schools')
            .update({
              stripe_subscription_id: session.subscription,
              subscription_status: 'active',
              subscription_plan: 'monthly',
            })
            .eq('id', schoolId)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as SubscriptionWithPeriod
        const schoolId = subscription.metadata?.school_id

        if (schoolId) {
          const status = subscription.status === 'trialing' ? 'trialing' : subscription.status
          const trialEnd = subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null
          const currentPeriodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null

          await (adminClient as any)
            .from('schools')
            .update({
              stripe_subscription_id: subscription.id,
              subscription_status: status,
              trial_ends_at: trialEnd,
              current_period_end: currentPeriodEnd,
            })
            .eq('id', schoolId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const schoolId = subscription.metadata?.school_id

        if (schoolId) {
          await (adminClient as any)
            .from('schools')
            .update({
              subscription_status: 'canceled',
              stripe_subscription_id: null,
            })
            .eq('id', schoolId)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any
        const subscriptionId = invoice.subscription as string

        if (subscriptionId) {
          // Find school by subscription ID and update status
          const { data: schools } = await (adminClient as any)
            .from('schools')
            .select('id')
            .eq('stripe_subscription_id', subscriptionId)
            .limit(1)

          if (schools && schools.length > 0) {
            await (adminClient as any)
              .from('schools')
              .update({ subscription_status: 'active' })
              .eq('id', schools[0].id)

            // Record the payment
            const periodStart = (invoice as any).period_start
            const periodEnd = (invoice as any).period_end
            await (adminClient as any)
              .from('payments')
              .insert({
                school_id: schools[0].id,
                stripe_invoice_id: invoice.id,
                stripe_payment_intent_id: invoice.payment_intent,
                amount: invoice.amount_paid,
                currency: invoice.currency,
                status: 'succeeded',
                description: `Subscription payment - ${periodStart ? new Date(periodStart * 1000).toLocaleDateString() : ''} to ${periodEnd ? new Date(periodEnd * 1000).toLocaleDateString() : ''}`,
              })
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any
        const subscriptionId = invoice.subscription as string

        if (subscriptionId) {
          const { data: schools } = await (adminClient as any)
            .from('schools')
            .select('id')
            .eq('stripe_subscription_id', subscriptionId)
            .limit(1)

          if (schools && schools.length > 0) {
            await (adminClient as any)
              .from('schools')
              .update({ subscription_status: 'past_due' })
              .eq('id', schools[0].id)
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
