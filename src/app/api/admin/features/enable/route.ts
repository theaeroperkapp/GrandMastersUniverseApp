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

    const { schoolId, featureCode, pricingModel, trialDays, postTrialMonthlyFee } = await request.json()

    if (!schoolId || !featureCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get feature details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: feature } = await (adminClient as any)
      .from('platform_features')
      .select('*')
      .eq('feature_code', featureCode)
      .single()

    if (!feature) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 })
    }

    // Get school
    const { data: school } = await adminClient
      .from('schools')
      .select('id, name')
      .eq('id', schoolId)
      .single()

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    // Calculate pricing based on model
    const effectivePricingModel = pricingModel || 'standard'
    const customTrialDays = typeof trialDays === 'number' ? trialDays : 30
    const postTrialFee = typeof postTrialMonthlyFee === 'number' ? postTrialMonthlyFee : null

    let status = 'active'
    let monthlyFee = 0
    let oneTimeFee = null
    let trialEndDate = null

    switch (effectivePricingModel) {
      case 'free':
        status = 'active'
        monthlyFee = 0
        break
      case 'trial':
        status = 'trial'
        monthlyFee = postTrialFee || feature.default_monthly_price
        trialEndDate = new Date()
        trialEndDate.setDate(trialEndDate.getDate() + customTrialDays)
        break
      case 'one_time':
        status = 'pending_payment'
        oneTimeFee = feature.default_onetime_price
        break
      case 'standard':
      default:
        status = 'pending_payment'
        monthlyFee = feature.default_monthly_price
        break
    }

    // Check if subscription exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingSub } = await (adminClient as any)
      .from('school_feature_subscriptions')
      .select('id')
      .eq('school_id', schoolId)
      .eq('feature_code', featureCode)
      .maybeSingle()

    if (existingSub) {
      // Update existing subscription
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from('school_feature_subscriptions')
        .update({
          is_enabled: true,
          status,
          pricing_model: effectivePricingModel,
          monthly_fee: monthlyFee,
          one_time_fee: oneTimeFee,
          post_trial_monthly_fee: effectivePricingModel === 'trial' ? postTrialFee : null,
          trial_end_date: trialEndDate?.toISOString() || null,
          enabled_at: new Date().toISOString(),
          enabled_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSub.id)
    } else {
      // Create new subscription
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from('school_feature_subscriptions')
        .insert({
          school_id: schoolId,
          feature_code: featureCode,
          is_enabled: true,
          status,
          pricing_model: effectivePricingModel,
          monthly_fee: monthlyFee,
          one_time_fee: oneTimeFee,
          post_trial_monthly_fee: effectivePricingModel === 'trial' ? postTrialFee : null,
          trial_end_date: trialEndDate?.toISOString() || null,
          enabled_at: new Date().toISOString(),
          enabled_by: user.id,
        })
    }

    return NextResponse.json({
      success: true,
      status,
      message: status === 'trial'
        ? `Feature enabled with ${customTrialDays}-day trial.`
        : status === 'pending_payment'
        ? 'Feature enabled. Payment required to activate.'
        : 'Feature enabled successfully.',
    })
  } catch (error) {
    console.error('Error enabling feature:', error)
    return NextResponse.json({ error: 'Failed to enable feature' }, { status: 500 })
  }
}
