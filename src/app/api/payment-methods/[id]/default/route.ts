import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { setDefaultPaymentMethod, getCustomerPaymentMethods } from '@/lib/stripe'

// POST - Set payment method as default
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentMethodId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get user profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role, family_id, school_id')
      .eq('id', user.id)
      .single() as { data: { role: string; family_id: string | null; school_id: string | null } | null }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    let customerId: string | null = null

    // Get customer ID based on role
    if (profile.role === 'owner' && profile.school_id) {
      const { data: school } = await adminClient
        .from('schools')
        .select('stripe_customer_id')
        .eq('id', profile.school_id)
        .single() as { data: { stripe_customer_id: string | null } | null }

      customerId = school?.stripe_customer_id || null
    } else if (profile.family_id) {
      const { data: family } = await adminClient
        .from('families')
        .select('stripe_customer_id')
        .eq('id', profile.family_id)
        .single() as { data: { stripe_customer_id: string | null } | null }

      customerId = family?.stripe_customer_id || null
    }

    if (!customerId) {
      return NextResponse.json(
        { error: 'No billing account found' },
        { status: 400 }
      )
    }

    // Verify the payment method belongs to this customer
    const paymentMethods = await getCustomerPaymentMethods(customerId) as { data: Array<{ id: string }> }
    const belongsToCustomer = paymentMethods.data.some(
      (pm: { id: string }) => pm.id === paymentMethodId
    )

    if (!belongsToCustomer) {
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 404 }
      )
    }

    // Set as default
    await setDefaultPaymentMethod(customerId, paymentMethodId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error setting default payment method:', error)
    return NextResponse.json(
      { error: 'Failed to set default payment method' },
      { status: 500 }
    )
  }
}
