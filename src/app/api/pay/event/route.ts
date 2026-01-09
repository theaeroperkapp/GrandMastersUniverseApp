import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createCustomer,
  createConnectPaymentIntent,
  createAndConfirmConnectPayment,
} from '@/lib/stripe'
import { createPaymentNotification } from '@/lib/notifications'
import { calculatePlatformFee } from '@/lib/platform-fee'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { payment_id, payment_method_id, save_card } = body

    const adminClient = createAdminClient()

    // Get user profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('family_id')
      .eq('id', user.id)
      .single() as { data: { family_id: string | null } | null }

    if (!profile?.family_id) {
      return NextResponse.json({ error: 'No family account found' }, { status: 400 })
    }

    // Get the event registration with event and school info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: registration } = await (adminClient as any)
      .from('event_registrations')
      .select('*, event:events(title, fee, school_id, school:schools(id, stripe_account_id, subscription_plan))')
      .eq('id', payment_id)
      .eq('family_id', profile.family_id)
      .eq('payment_status', 'pending')
      .single()

    type RegistrationType = {
      id: string
      event_id: string
      family_id: string
      payment_status: string
      payment_intent_id: string | null
      event: {
        title: string
        fee: number | null
        school_id: string
        school: { id: string; stripe_account_id: string | null; subscription_plan: string | null } | null
      } | null
    }

    const typedRegistration = registration as RegistrationType | null

    if (!typedRegistration) {
      return NextResponse.json({ error: 'Registration not found or already paid' }, { status: 404 })
    }

    const eventFee = typedRegistration.event?.fee || 0
    const eventTitle = typedRegistration.event?.title || 'Event Registration'

    if (eventFee === 0) {
      return NextResponse.json({ error: 'This event is free' }, { status: 400 })
    }

    // Check if school has Connect account set up
    if (!typedRegistration.event?.school?.stripe_account_id) {
      return NextResponse.json(
        { error: 'School has not set up payment processing. Please contact the school.' },
        { status: 400 }
      )
    }

    const connectedAccountId = typedRegistration.event.school.stripe_account_id

    // Calculate platform fee
    const { platformFee } = calculatePlatformFee(
      eventFee,
      typedRegistration.event.school.subscription_plan
    )

    // Get family for customer info
    const { data: family } = await adminClient
      .from('families')
      .select('id, stripe_customer_id, name, billing_email')
      .eq('id', profile.family_id)
      .single() as { data: { id: string; stripe_customer_id: string | null; name: string; billing_email: string | null } | null }

    if (!family) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 })
    }

    // Get or create Stripe customer
    let customerId = family.stripe_customer_id
    if (!customerId) {
      const customer = await createCustomer(
        family.billing_email || user.email || '',
        family.name,
        { family_id: family.id, type: 'family' }
      )
      customerId = customer.id

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from('families')
        .update({ stripe_customer_id: customerId })
        .eq('id', family.id)
    }

    const metadata = {
      type: 'event_registration',
      registration_id: typedRegistration.id,
      event_id: typedRegistration.event_id,
      family_id: family.id,
      user_id: user.id,
      school_id: typedRegistration.event.school_id,
      platform_fee: platformFee.toString(),
    }

    if (payment_method_id) {
      // Pay with saved card - confirm immediately with Connect
      try {
        const paymentIntent = await createAndConfirmConnectPayment(
          eventFee,
          'usd',
          connectedAccountId,
          platformFee,
          customerId,
          payment_method_id,
          metadata
        )

        if (paymentIntent.status === 'succeeded') {
          // Update registration status
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (adminClient as any)
            .from('event_registrations')
            .update({
              payment_status: 'paid',
              payment_intent_id: paymentIntent.id,
            })
            .eq('id', typedRegistration.id)

          // Create success notification
          await createPaymentNotification({
            userId: user.id,
            success: true,
            amount: eventFee,
            description: eventTitle,
            relatedId: typedRegistration.id,
          })

          return NextResponse.json({
            success: true,
            status: 'succeeded',
            payment_intent_id: paymentIntent.id,
          })
        }

        if (paymentIntent.status === 'requires_action') {
          return NextResponse.json({
            requires_action: true,
            client_secret: paymentIntent.client_secret,
            payment_intent_id: paymentIntent.id,
          })
        }

        throw new Error('Payment failed')
      } catch (error: unknown) {
        const stripeError = error as { message?: string }
        // Create failure notification
        await createPaymentNotification({
          userId: user.id,
          success: false,
          amount: eventFee,
          description: eventTitle,
          relatedId: typedRegistration.id,
        })

        return NextResponse.json(
          { error: stripeError.message || 'Payment failed' },
          { status: 400 }
        )
      }
    } else {
      // Create payment intent for new card with Connect
      const paymentIntent = await createConnectPaymentIntent(
        eventFee,
        'usd',
        connectedAccountId,
        platformFee,
        customerId,
        {
          ...metadata,
          save_card: save_card ? 'true' : 'false',
        }
      )

      // Store payment intent ID
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from('event_registrations')
        .update({ payment_intent_id: paymentIntent.id })
        .eq('id', typedRegistration.id)

      return NextResponse.json({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
      })
    }
  } catch (error) {
    console.error('Error processing event payment:', error)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}
