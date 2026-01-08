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

    const { schoolId, featureCode, enable } = await request.json()

    if (!schoolId || !featureCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const adminClient = createAdminClient()

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
          is_enabled: enable,
          enabled_at: enable ? new Date().toISOString() : null,
          enabled_by: enable ? user.id : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSub.id)
    } else if (enable) {
      // Create new subscription
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from('school_feature_subscriptions')
        .insert({
          school_id: schoolId,
          feature_code: featureCode,
          is_enabled: true,
          enabled_at: new Date().toISOString(),
          enabled_by: user.id,
        })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error toggling feature:', error)
    return NextResponse.json({ error: 'Failed to toggle feature' }, { status: 500 })
  }
}
