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

    // Get the belt test payment with school info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: beltTestPayment } = await (adminClient as any)
      .from('belt_test_payments')
      .select(`
        *,
        belt_test_fee:belt_test_fees(
          description,
          from_belt:belt_ranks!belt_test_fees_from_belt_id_fkey(name),
          to_belt:belt_ranks!belt_test_fees_to_belt_id_fkey(name)
        ),
        school:schools(id, stripe_account_id, subscription_plan)
      `)
      .eq('id', payment_id)
      .eq('family_id', profile.family_id)
      .eq('status', 'pending')
      .single()

    type BeltTestPaymentType = {
      id: string
      school_id: string
      family_id: string
      student_profile_id: string
      amount: number
      status: string
      payment_intent_id: string | null
      belt_test_fee: {
        description: string | null
        from_belt: { name: string } | null
        to_belt: { name: string } | null
      } | null
      school: { id: string; stripe_account_id: string | null; subscription_plan: string | null } | null
    }

    const typedPayment = beltTestPayment as BeltTestPaymentType | null

    if (!typedPayment) {
      return NextResponse.json({ error: 'Belt test payment not found or already paid' }, { status: 404 })
    }

    // Check if school has Connect account set up
    if (!typedPayment.school?.stripe_account_id) {
      return NextResponse.json(
        { error: 'School has not set up payment processing. Please contact the school.' },
        { status: 400 }
      )
    }

    const connectedAccountId = typedPayment.school.stripe_account_id

    // Calculate platform fee
    const { platformFee } = calculatePlatformFee(
      typedPayment.amount,
      typedPayment.school.subscription_plan
    )

    // Build description
    let description = 'Belt Test Fee'
    if (typedPayment.belt_test_fee?.from_belt && typedPayment.belt_test_fee?.to_belt) {
      description = `Belt Test: ${typedPayment.belt_test_fee.from_belt.name} → ${typedPayment.belt_test_fee.to_belt.name}`
    } else if (typedPayment.belt_test_fee?.description) {
      description = typedPayment.belt_test_fee.description
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

    // TypeScript type narrowing - customerId is definitely a string after the above logic
    const validCustomerId: string = customerId!

    const metadata = {
      type: 'belt_test',
      belt_test_payment_id: typedPayment.id,
      family_id: family.id,
      user_id: user.id,
      school_id: typedPayment.school_id,
      platform_fee: platformFee.toString(),
    }

    if (payment_method_id) {
      // Pay with saved card - confirm immediately with Connect
      try {
        const paymentIntent = await createAndConfirmConnectPayment(
          typedPayment.amount,
          'usd',
          connectedAccountId,
          platformFee,
          validCustomerId,
          payment_method_id,
          metadata
        )

        if (paymentIntent.status === 'succeeded') {
          // Update payment status
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (adminClient as any)
            .from('belt_test_payments')
            .update({
              status: 'paid',
              payment_intent_id: paymentIntent.id,
              paid_at: new Date().toISOString(),
            })
            .eq('id', typedPayment.id)

          // Create success notification
          await createPaymentNotification({
            userId: user.id,
            success: true,
            amount: typedPayment.amount,
            description,
            relatedId: typedPayment.id,
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
          amount: typedPayment.amount,
          description,
          relatedId: typedPayment.id,
        })

        return NextResponse.json(
          { error: stripeError.message || 'Payment failed' },
          { status: 400 }
        )
      }
    } else {
      // Create payment intent for new card with Connect
      const paymentIntent = await createConnectPaymentIntent(
        typedPayment.amount,
        'usd',
        connectedAccountId,
        platformFee,
        validCustomerId,
        {
          ...metadata,
          save_card: save_card ? 'true' : 'false',
        }
      )

      // Store payment intent ID
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from('belt_test_payments')
        .update({ payment_intent_id: paymentIntent.id })
        .eq('id', typedPayment.id)

      return NextResponse.json({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
      })
    }
  } catch (error) {
    console.error('Error processing belt test payment:', error)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}
