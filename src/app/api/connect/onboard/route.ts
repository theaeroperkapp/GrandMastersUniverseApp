import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createConnectAccount, createConnectAccountLink } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile and school
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, school_id, email, full_name')
      .eq('id', user.id)
      .single()

    const profile = profileData as { role: string; school_id: string | null; email: string; full_name: string } | null

    if (!profile || profile.role !== 'owner') {
      return NextResponse.json({ error: 'Only school owners can set up payments' }, { status: 403 })
    }

    if (!profile.school_id) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 })
    }

    // Check if school already has a Connect account
    const { data: schoolData } = await supabase
      .from('schools')
      .select('stripe_account_id')
      .eq('id', profile.school_id)
      .single()

    const school = schoolData as { stripe_account_id: string | null } | null
    let accountId = school?.stripe_account_id

    // Create Connect account if doesn't exist
    if (!accountId) {
      const account = await createConnectAccount(profile.email, {
        school_id: profile.school_id,
        owner_name: profile.full_name,
      })
      accountId = account.id

      // Save to school record
      await (adminClient as any)
        .from('schools')
        .update({ stripe_account_id: accountId })
        .eq('id', profile.school_id)
    }

    // Create account link for onboarding
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const accountLink = await createConnectAccountLink(
      accountId,
      `${appUrl}/owner/subscription?connect=refresh`,
      `${appUrl}/owner/subscription?connect=complete`
    )

    return NextResponse.json({ url: accountLink.url })
  } catch (error) {
    console.error('Connect onboard error:', error)
    return NextResponse.json({ error: 'Failed to create onboarding link' }, { status: 500 })
  }
}
