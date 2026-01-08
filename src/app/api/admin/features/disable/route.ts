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

    const { schoolId, featureCode } = await request.json()

    if (!schoolId || !featureCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Update subscription to disabled
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient as any)
      .from('school_feature_subscriptions')
      .update({
        is_enabled: false,
        status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('school_id', schoolId)
      .eq('feature_code', featureCode)

    if (error) {
      console.error('Error disabling feature:', error)
      return NextResponse.json({ error: 'Failed to disable feature' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error disabling feature:', error)
    return NextResponse.json({ error: 'Failed to disable feature' }, { status: 500 })
  }
}
