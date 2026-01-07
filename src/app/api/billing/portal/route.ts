import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { school_id } = body

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

    // Get school's Stripe customer ID
    const { data: school } = await supabase
      .from('schools')
      .select('stripe_customer_id')
      .eq('id', school_id)
      .single()

    const schoolData = school as { stripe_customer_id: string | null } | null

    if (!schoolData?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
    }

    // Create Customer Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: schoolData.stripe_customer_id,
      return_url: `${APP_URL}/owner/subscription`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Portal error:', error)
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
