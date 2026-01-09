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

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
    }

    // Get the custom charge with school info
    // Check for charges assigned to the user's family OR directly to the user
    let chargeQuery = adminClient
      .from('custom_charges')
      .select('*, school:schools(id, stripe_account_id, subscription_plan)')
      .eq('id', payment_id)
      .eq('status', 'pending')

    if (profile.family_id) {
      // Check for family charges OR profile charges
      chargeQuery = chargeQuery.or(`family_id.eq.${profile.family_id},profile_id.eq.${user.id}`)
    } else {
      // Only check for profile charges
      chargeQuery = chargeQuery.eq('profile_id', user.id)
    }

    const { data: charge } = await chargeQuery.single() as { data: {
        id: string
        amount: number
        description: string
        status: string
        school_id: string
        family_id: string | null
        profile_id: string | null
        school: { id: string; stripe_account_id: string | null; subscription_plan: string | null } | null
      } | null }

    if (!charge) {
      return NextResponse.json({ error: 'Charge not found or already paid' }, { status: 404 })
    }

    // Check if school has Connect account set up
    if (!charge.school?.stripe_account_id) {
      return NextResponse.json(
        { error: 'School has not set up payment processing. Please contact the school.' },
        { status: 400 }
      )
    }

    const connectedAccountId = charge.school.stripe_account_id

    // Calculate platform fee
    const { platformFee } = calculatePlatformFee(
      charge.amount,
      charge.school.subscription_plan
    )

    // Get customer info - prefer family customer (since saved cards are tied to it)
    let customerId: string | null = null
    let customerName = ''
    let customerEmail = user.email || ''
    let familyId: string | null = null

    // First, try to use the user's family customer (even for individual charges)
    // This ensures saved payment methods work across all charges
    const familyToCheck = charge.family_id || profile.family_id

    if (familyToCheck) {
      const { data: family } = await adminClient
        .from('families')
        .select('id, stripe_customer_id, name, billing_email')
        .eq('id', familyToCheck)
        .single() as { data: { id: string; stripe_customer_id: string | null; name: string; billing_email: string | null } | null }

      if (family) {
        customerId = family.stripe_customer_id
        customerName = family.name
        customerEmail = family.billing_email || user.email || ''
        familyId = family.id

        if (!customerId) {
          const customer = await createCustomer(
            customerEmail,
            customerName,
            { family_id: family.id, type: 'family' }
          )
          customerId = customer.id

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (adminClient as any)
            .from('families')
            .update({ stripe_customer_id: customerId })
            .eq('id', family.id)
        }
      }
    }

    // If no family or charge is profile-based, use profile info
    if (!customerId) {
      const { data: userProfile, error: profileError } = await adminClient
        .from('profiles')
        .select('id, full_name, email, stripe_customer_id')
        .eq('id', user.id)
        .single() as { data: { id: string; full_name: string; email: string | null; stripe_customer_id: string | null } | null; error: unknown }

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        return NextResponse.json({ error: 'Could not fetch profile' }, { status: 400 })
      }

      if (userProfile) {
        customerId = userProfile.stripe_customer_id
        customerName = userProfile.full_name
        customerEmail = userProfile.email || user.email || ''

        if (!customerId) {
          try {
            const customer = await createCustomer(
              customerEmail,
              customerName,
              { profile_id: userProfile.id, type: 'individual' }
            )
            customerId = customer.id

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (adminClient as any)
              .from('profiles')
              .update({ stripe_customer_id: customerId })
              .eq('id', userProfile.id)
          } catch (stripeErr) {
            console.error('Error creating Stripe customer:', stripeErr)
            return NextResponse.json({ error: 'Failed to create payment customer' }, { status: 400 })
          }
        }
      }
    }

    if (!customerId) {
      console.error('Could not create customer - no profile found for user:', user.id)
      return NextResponse.json({ error: 'Could not create customer' }, { status: 400 })
    }

    const metadata = {
      type: 'custom_charge',
      charge_id: charge.id,
      family_id: familyId || '',
      profile_id: charge.profile_id || '',
      user_id: user.id,
      school_id: charge.school_id,
      platform_fee: platformFee.toString(),
    }

    if (payment_method_id) {
      // Pay with saved card - confirm immediately with Connect
      try {
        const paymentIntent = await createAndConfirmConnectPayment(
          charge.amount,
          'usd',
          connectedAccountId,
          platformFee,
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
      // Create payment intent for new card with Connect
      const paymentIntent = await createConnectPaymentIntent(
        charge.amount,
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
