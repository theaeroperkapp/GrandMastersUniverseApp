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

    const { schoolId, amount, note } = await request.json()

    if (!schoolId || amount === undefined || amount < 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Calculate period dates (1 month subscription period)
    const now = new Date()
    const periodStart = now.toISOString()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    // Record payment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: paymentError } = await (adminClient as any)
      .from('platform_payments')
      .insert({
        school_id: schoolId,
        amount,
        payment_type: 'manual',
        status: 'succeeded',
        description: 'Manual subscription payment',
        payment_method: 'manual',
        paid_at: now.toISOString(),
        period_start: periodStart,
        period_end: periodEnd.toISOString(),
        recorded_by: user.id,
        notes: note || null,
      })

    if (paymentError) {
      console.error('Error recording payment:', paymentError)
      return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
    }

    // Update school to standard active status if payment received
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('schools')
      .update({
        subscription_status: 'active',
        subscription_plan: 'standard',
        updated_at: new Date().toISOString(),
      })
      .eq('id', schoolId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error recording payment:', error)
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
  }
}
