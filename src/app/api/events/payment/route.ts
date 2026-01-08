import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyAdminClient = adminClient as any

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { event_id, student_profile_id, family_id } = body

    if (!event_id || !student_profile_id) {
      return NextResponse.json(
        { error: 'Event ID and student profile ID are required' },
        { status: 400 }
      )
    }

    // Get user's profile to verify school
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, email, full_name')
      .eq('id', user.id)
      .single()

    if (!profile?.school_id) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 })
    }

    // Get event details
    const { data: event } = await anyAdminClient
      .from('events')
      .select('*, school:schools(name), registrations:event_registrations(count)')
      .eq('id', event_id)
      .eq('school_id', profile.school_id)
      .eq('is_published', true)
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if event has a fee
    if (!event.fee || event.fee <= 0) {
      return NextResponse.json(
        { error: 'This is a free event. Use the register endpoint instead.' },
        { status: 400 }
      )
    }

    // Check registration deadline
    if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
      return NextResponse.json({ error: 'Registration deadline has passed' }, { status: 400 })
    }

    // Check capacity
    const currentCount = event.registrations?.[0]?.count || 0
    if (event.max_capacity && currentCount >= event.max_capacity) {
      return NextResponse.json({ error: 'Event is at full capacity' }, { status: 400 })
    }

    // Check if already registered
    const { data: existingReg } = await anyAdminClient
      .from('event_registrations')
      .select('id')
      .eq('event_id', event_id)
      .eq('student_profile_id', student_profile_id)
      .single()

    if (existingReg) {
      return NextResponse.json({ error: 'Already registered for this event' }, { status: 400 })
    }

    // Create a pending registration
    const { data: registration, error: regError } = await anyAdminClient
      .from('event_registrations')
      .insert({
        event_id,
        student_profile_id,
        family_id: family_id || null,
        payment_status: 'pending',
      })
      .select()
      .single()

    if (regError) {
      console.error('Registration error:', regError)
      return NextResponse.json({ error: 'Failed to create registration' }, { status: 500 })
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: event.title,
              description: `Event registration: ${event.title}`,
            },
            unit_amount: event.fee, // Already in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: profile.email || user.email,
      success_url: `${APP_URL}/events?success=true&event=${event_id}`,
      cancel_url: `${APP_URL}/events?canceled=true&event=${event_id}`,
      metadata: {
        event_id,
        student_profile_id,
        registration_id: registration.id,
        user_id: user.id,
        type: 'event_registration',
      },
    })

    // Update registration with payment intent ID
    if (session.payment_intent) {
      await anyAdminClient
        .from('event_registrations')
        .update({ payment_intent_id: session.payment_intent as string })
        .eq('id', registration.id)
    }

    return NextResponse.json({
      success: true,
      url: session.url,
      registration_id: registration.id,
    })
  } catch (error) {
    console.error('Event payment error:', error)
    return NextResponse.json({ error: 'Failed to create payment session' }, { status: 500 })
  }
}
