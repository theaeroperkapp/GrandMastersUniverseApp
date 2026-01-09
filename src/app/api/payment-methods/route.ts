import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createCustomer,
  getCustomerPaymentMethods,
  createSetupIntent,
  getCustomer,
} from '@/lib/stripe'

// GET - List saved payment methods
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get user profile to determine customer type
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role, family_id, school_id')
      .eq('id', user.id)
      .single() as { data: { role: string; family_id: string | null; school_id: string | null } | null }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    let customerId: string | null = null

    // Check if owner - use school customer
    if (profile.role === 'owner' && profile.school_id) {
      const { data: school } = await adminClient
        .from('schools')
        .select('stripe_customer_id')
        .eq('id', profile.school_id)
        .single() as { data: { stripe_customer_id: string | null } | null }

      customerId = school?.stripe_customer_id || null
    }
    // Otherwise use family customer
    else if (profile.family_id) {
      const { data: family } = await adminClient
        .from('families')
        .select('stripe_customer_id')
        .eq('id', profile.family_id)
        .single() as { data: { stripe_customer_id: string | null } | null }

      customerId = family?.stripe_customer_id || null
    }
    // Fallback to individual profile billing
    else {
      const { data: profileBilling } = await adminClient
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single() as { data: { stripe_customer_id: string | null } | null }

      customerId = profileBilling?.stripe_customer_id || null
    }

    if (!customerId) {
      return NextResponse.json({ payment_methods: [], default_payment_method: null })
    }

    // Get payment methods from Stripe
    const paymentMethods = await getCustomerPaymentMethods(customerId)

    // Get default payment method
    const customer = await getCustomer(customerId)
    const defaultPaymentMethodId =
      typeof customer !== 'string' && 'invoice_settings' in customer
        ? customer.invoice_settings?.default_payment_method
        : null

    const methods = paymentMethods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand || 'unknown',
      last4: pm.card?.last4 || '****',
      exp_month: pm.card?.exp_month,
      exp_year: pm.card?.exp_year,
      is_default: pm.id === defaultPaymentMethodId,
    }))

    return NextResponse.json({
      payment_methods: methods,
      default_payment_method: defaultPaymentMethodId,
    })
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment methods' },
      { status: 500 }
    )
  }
}

// POST - Create SetupIntent for adding new card
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get user profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role, family_id, school_id, full_name, email')
      .eq('id', user.id)
      .single() as { data: { role: string; family_id: string | null; school_id: string | null; full_name: string | null; email: string | null } | null }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    let customerId: string | null = null
    let entityId: string | null = null
    let entityType: 'school' | 'family' | null = null

    // Check if owner - use school customer
    if (profile.role === 'owner' && profile.school_id) {
      const { data: school } = await adminClient
        .from('schools')
        .select('id, stripe_customer_id, name')
        .eq('id', profile.school_id)
        .single() as { data: { id: string; stripe_customer_id: string | null; name: string } | null }

      if (school) {
        customerId = school.stripe_customer_id
        entityId = school.id
        entityType = 'school'

        // Create customer if not exists
        if (!customerId) {
          const newCustomer = await createCustomer(
            profile.email || user.email || '',
            school.name,
            { school_id: school.id, type: 'school' }
          )
          customerId = newCustomer.id

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (adminClient as any)
            .from('schools')
            .update({ stripe_customer_id: customerId })
            .eq('id', school.id)
        }
      }
    }
    // Otherwise use family customer
    else if (profile.family_id) {
      const { data: family } = await adminClient
        .from('families')
        .select('id, stripe_customer_id, name, billing_email')
        .eq('id', profile.family_id)
        .single() as { data: { id: string; stripe_customer_id: string | null; name: string; billing_email: string | null } | null }

      if (family) {
        customerId = family.stripe_customer_id
        entityId = family.id
        entityType = 'family'

        // Create customer if not exists
        if (!customerId) {
          const newCustomer = await createCustomer(
            family.billing_email || profile.email || user.email || '',
            family.name,
            { family_id: family.id, type: 'family' }
          )
          customerId = newCustomer.id

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (adminClient as any)
            .from('families')
            .update({ stripe_customer_id: customerId })
            .eq('id', family.id)
        }
      }
    }
    // Fallback to individual profile billing
    else {
      // Get or create stripe customer for individual profile
      const { data: profileData } = await adminClient
        .from('profiles')
        .select('id, stripe_customer_id')
        .eq('id', user.id)
        .single() as { data: { id: string; stripe_customer_id: string | null } | null }

      if (profileData) {
        customerId = profileData.stripe_customer_id
        entityId = profileData.id
        entityType = 'family' // Use 'family' type for compatibility

        // Create customer if not exists
        if (!customerId) {
          try {
            console.log('Creating Stripe customer for individual profile:', profileData.id)
            const newCustomer = await createCustomer(
              profile.email || user.email || '',
              profile.full_name || 'Individual',
              { profile_id: profileData.id, type: 'individual' }
            )
            customerId = newCustomer.id
            console.log('Created Stripe customer:', customerId)

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (adminClient as any)
              .from('profiles')
              .update({ stripe_customer_id: customerId })
              .eq('id', profileData.id)
          } catch (customerError) {
            console.error('Failed to create Stripe customer:', customerError)
            const errMsg = customerError instanceof Error ? customerError.message : 'Unknown error'
            return NextResponse.json(
              { error: `Failed to create billing account: ${errMsg}` },
              { status: 500 }
            )
          }
        }
      }
    }

    if (!customerId) {
      return NextResponse.json(
        { error: 'No billing account found' },
        { status: 400 }
      )
    }

    // Create SetupIntent
    const setupIntent = await createSetupIntent(customerId)

    return NextResponse.json({
      client_secret: setupIntent.client_secret,
      setup_intent_id: setupIntent.id,
      customer_id: customerId,
      entity_type: entityType,
      entity_id: entityId,
    })
  } catch (error) {
    console.error('Error creating setup intent:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to create setup intent: ${errorMessage}` },
      { status: 500 }
    )
  }
}
