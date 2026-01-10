import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe, createCustomer } from '@/lib/stripe'

const PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_placeholder'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { school_id, email } = body

    if (!school_id) {
      return NextResponse.json({ error: 'Missing school_id' }, { status: 400 })
    }

    // Verify user is the school owner
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: string; school_id: string | null } | null

    if (!profileData || profileData.role !== 'owner' || profileData.school_id !== school_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get school info
    const { data: school } = await supabase
      .from('schools')
      .select('id, name, stripe_customer_id')
      .eq('id', school_id)
      .single()

    const schoolData = school as { id: string; name: string; stripe_customer_id: string | null } | null

    if (!schoolData) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    // Create or retrieve Stripe customer
    let customerId = schoolData.stripe_customer_id

    if (!customerId) {
      const customer = await createCustomer(
        email || user.email || '',
        schoolData.name,
        {
          school_id: school_id,
          user_id: user.id,
        }
      )
      customerId = customer.id

      // Save customer ID to school
      await (adminClient as any)
        .from('schools')
        .update({ stripe_customer_id: customerId })
        .eq('id', school_id)
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId!,
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      success_url: `${APP_URL}/owner/subscription?success=true`,
      cancel_url: `${APP_URL}/owner/subscription?canceled=true`,
      metadata: {
        school_id,
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          school_id,
          user_id: user.id,
        },
        trial_period_days: 30,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
