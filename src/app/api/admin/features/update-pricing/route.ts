import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null }

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { schoolId, featureCode, pricingModel, monthlyFee, oneTimeFee, trialDays, postTrialMonthlyFee } = await request.json()

    if (!schoolId || !featureCode || !pricingModel) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Calculate new values based on pricing model
    let status = 'active'
    let trialEndDate = null
    let effectiveMonthlyFee = monthlyFee || 0
    let effectiveOneTimeFee = oneTimeFee || null

    switch (pricingModel) {
      case 'free':
        status = 'active'
        effectiveMonthlyFee = 0
        effectiveOneTimeFee = null
        break
      case 'trial':
        status = 'trial'
        const customTrialDays = typeof trialDays === 'number' ? trialDays : 30
        trialEndDate = new Date()
        trialEndDate.setDate(trialEndDate.getDate() + customTrialDays)
        effectiveMonthlyFee = postTrialMonthlyFee || monthlyFee || 0
        break
      case 'one_time':
        status = 'pending_payment'
        effectiveMonthlyFee = 0
        break
      case 'standard':
      default:
        status = 'pending_payment'
        break
    }

    // Update subscription
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient as any)
      .from('school_feature_subscriptions')
      .update({
        pricing_model: pricingModel,
        status,
        monthly_fee: effectiveMonthlyFee,
        one_time_fee: effectiveOneTimeFee,
        post_trial_monthly_fee: pricingModel === 'trial' ? postTrialMonthlyFee : null,
        trial_end_date: trialEndDate?.toISOString() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('school_id', schoolId)
      .eq('feature_code', featureCode)

    if (error) {
      console.error('Error updating pricing:', error)
      return NextResponse.json({ error: 'Failed to update pricing' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating pricing:', error)
    return NextResponse.json({ error: 'Failed to update pricing' }, { status: 500 })
  }
}
