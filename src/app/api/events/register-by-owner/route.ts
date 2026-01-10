import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe, createAndConfirmConnectPayment } from '@/lib/stripe'
import { calculatePlatformFee } from '@/lib/platform-fee'

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

    // Verify user is owner or admin
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single()

    const profile = profileData as { role: string; school_id: string | null } | null

    if (!profile || (profile.role !== 'owner' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Only owners and admins can register students' }, { status: 403 })
    }

    if (!profile.school_id) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 })
    }

    const body = await request.json()
    const { event_id, student_profile_ids } = body

    if (!event_id || !student_profile_ids || !Array.isArray(student_profile_ids) || student_profile_ids.length === 0) {
      return NextResponse.json({ error: 'Event ID and student profile IDs are required' }, { status: 400 })
    }

    // Get event details with school info
    const { data: event } = await anyAdminClient
      .from('events')
      .select('*, registrations:event_registrations(count), school:schools(id, stripe_account_id, subscription_plan)')
      .eq('id', event_id)
      .eq('school_id', profile.school_id)
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check registration deadline
    if (event.registration_deadline) {
      const deadline = new Date(event.registration_deadline)
      if (new Date() > deadline) {
        return NextResponse.json({ error: 'Registration deadline has passed' }, { status: 400 })
      }
    }

    // Check max capacity
    const currentCount = event.registrations?.[0]?.count || 0
    if (event.max_capacity && currentCount + student_profile_ids.length > event.max_capacity) {
      return NextResponse.json({
        error: `Only ${event.max_capacity - currentCount} spots remaining`
      }, { status: 400 })
    }

    // Check for existing registrations
    const { data: existingRegs } = await anyAdminClient
      .from('event_registrations')
      .select('student_profile_id')
      .eq('event_id', event_id)
      .in('student_profile_id', student_profile_ids)

    const existingIds = (existingRegs || []).map((r: { student_profile_id: string }) => r.student_profile_id)
    const newProfileIds = student_profile_ids.filter((id: string) => !existingIds.includes(id))

    if (newProfileIds.length === 0) {
      return NextResponse.json({
        error: 'All selected students are already registered for this event',
        already_registered: existingIds.length,
        registered: 0
      }, { status: 400 })
    }

    const isPaidEvent = event.fee && event.fee > 0
    const results = {
      registered: 0,
      charged: 0,
      pendingPayment: 0,
      notified: 0,
      already_registered: existingIds.length,
    }

    // Process each student
    for (const studentProfileId of newProfileIds) {
      // Get student profile to find the user
      const { data: studentProfile } = await anyAdminClient
        .from('student_profiles')
        .select('profile_id')
        .eq('id', studentProfileId)
        .single()

      if (!studentProfile) continue

      // Get the user's profile to check for family or individual billing
      const { data: userProfile } = await anyAdminClient
        .from('profiles')
        .select('id, family_id, stripe_customer_id, full_name')
        .eq('id', studentProfile.profile_id)
        .single()

      if (!userProfile) continue

      let paymentStatus = 'paid' // Default for free events
      let paymentIntentId: string | null = null
      let customerId: string | null = null
      let defaultPaymentMethod: string | null = null

      if (isPaidEvent) {
        paymentStatus = 'pending' // Will be updated if payment succeeds

        // Try to find a payment method (family first, then individual)
        if (userProfile.family_id) {
          const { data: family } = await anyAdminClient
            .from('families')
            .select('stripe_customer_id')
            .eq('id', userProfile.family_id)
            .single()

          if (family?.stripe_customer_id) {
            customerId = family.stripe_customer_id
          }
        }

        if (!customerId && userProfile.stripe_customer_id) {
          customerId = userProfile.stripe_customer_id
        }

        // If we have a customer, try to get their default payment method
        if (customerId) {
          try {
            const paymentMethods = await stripe.paymentMethods.list({
              customer: customerId,
              type: 'card',
              limit: 1,
            })
            if (paymentMethods.data.length > 0) {
              defaultPaymentMethod = paymentMethods.data[0].id
            }
          } catch (e) {
            console.error('Error fetching payment methods:', e)
          }
        }

        // If we have a payment method and the school has Stripe Connect, charge automatically
        if (defaultPaymentMethod && event.school?.stripe_account_id) {
          try {
            const { platformFee } = calculatePlatformFee(event.fee, event.school.subscription_plan)

            const paymentIntent = await createAndConfirmConnectPayment(
              event.fee,
              'usd',
              event.school.stripe_account_id,
              platformFee,
              customerId!,
              defaultPaymentMethod,
              {
                type: 'event_registration',
                event_id: event_id,
                student_profile_id: studentProfileId,
                registered_by: 'owner',
              }
            )

            if (paymentIntent.status === 'succeeded') {
              paymentStatus = 'paid'
              paymentIntentId = paymentIntent.id
              results.charged++
            }
          } catch (e) {
            console.error('Auto-charge failed:', e)
            // Payment failed, leave as pending
          }
        }

        // If payment is still pending, send notification
        if (paymentStatus === 'pending') {
          results.pendingPayment++

          // Create notification for the student
          await anyAdminClient
            .from('notifications')
            .insert({
              user_id: studentProfile.profile_id,
              type: 'payment',
              title: 'Event Registration - Payment Required',
              message: `You have been registered for "${event.title}". Please complete your payment of $${(event.fee / 100).toFixed(2)} to confirm your registration.`,
              is_read: false,
            })

          results.notified++
        }
      }

      // Create the registration
      const { error: regError } = await anyAdminClient
        .from('event_registrations')
        .insert({
          event_id,
          student_profile_id: studentProfileId,
          family_id: userProfile.family_id || null,
          payment_status: paymentStatus,
          payment_intent_id: paymentIntentId,
        })

      if (!regError) {
        results.registered++
      }
    }

    let message = `${results.registered} student(s) registered.`
    if (results.charged > 0) {
      message += ` ${results.charged} payment(s) charged automatically.`
    }
    if (results.pendingPayment > 0) {
      message += ` ${results.pendingPayment} student(s) notified to complete payment.`
    }

    return NextResponse.json({
      success: true,
      message,
      ...results,
    }, { status: 201 })
  } catch (error) {
    console.error('Owner registration API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
