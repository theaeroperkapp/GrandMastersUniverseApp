import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createCustomer,
  createPaymentIntent,
  createAndConfirmPayment,
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

    // Get the custom charge
    const { data: charge } = await adminClient
      .from('custom_charges')
      .select('*')
      .eq('id', payment_id)
      .eq('family_id', profile.family_id)
      .eq('status', 'pending')
      .single() as { data: { id: string; amount: number; description: string; status: string } | null }

    if (!charge) {
      return NextResponse.json({ error: 'Charge not found or already paid' }, { status: 404 })
    }

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
      type: 'custom_charge',
      charge_id: charge.id,
      family_id: family.id,
      user_id: user.id,
    }

    if (payment_method_id) {
      // Pay with saved card - confirm immediately
      try {
        const paymentIntent = await createAndConfirmPayment(
          charge.amount,
          'usd',
          customerId,
          payment_method_id,
          metadata
        )

        if (paymentIntent.status === 'succeeded') {
          // Update charge status
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (adminClient as any)
            .from('custom_charges')
            .update({
              status: 'paid',
              payment_intent_id: paymentIntent.id,
            })
            .eq('id', charge.id)

          // Create success notification
          await createPaymentNotification({
            userId: user.id,
            success: true,
            amount: charge.amount,
            description: charge.description,
            relatedId: charge.id,
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
          amount: charge.amount,
          description: charge.description,
          relatedId: charge.id,
        })

        return NextResponse.json(
          { error: stripeError.message || 'Payment failed' },
          { status: 400 }
        )
      }
    } else {
      // Create payment intent for new card
      const paymentIntent = await createPaymentIntent(
        charge.amount,
        'usd',
        customerId,
        {
          ...metadata,
          save_card: save_card ? 'true' : 'false',
        }
      )

      // Store payment intent ID
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from('custom_charges')
        .update({ payment_intent_id: paymentIntent.id })
        .eq('id', charge.id)

      return NextResponse.json({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
      })
    }
  } catch (error) {
    console.error('Error processing custom charge payment:', error)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}
