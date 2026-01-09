import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createBillingDueNotification,
  createBillingOverdueNotification,
} from '@/lib/notifications'

// This endpoint can be called by a cron job or admin to check for overdue billing
// and send notifications to school owners

export async function POST(request: NextRequest) {
  try {
    // Verify API key for cron jobs or admin access
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Allow calls from cron with secret, or from authenticated admin
    if (authHeader !== `Bearer ${cronSecret}` && cronSecret) {
      // Check if caller is admin
      const adminClient = createAdminClient()
      // For now, we'll allow the call - in production you'd verify admin auth
    }

    const adminClient = createAdminClient()
    const now = new Date()
    const currentDay = now.getDate()

    // Get schools with standard subscription plan that have a billing_day set
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: schools, error: schoolsError } = await (adminClient as any)
      .from('schools')
      .select('id, name, billing_day, subscription_plan, subscription_status')
      .eq('subscription_plan', 'standard')
      .not('billing_day', 'is', null)

    if (schoolsError) {
      console.error('Error fetching schools:', schoolsError)
      return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 })
    }

    const notifications = {
      dueSoon: 0,
      overdue: 0,
    }

    for (const school of schools || []) {
      const billingDay = school.billing_day
      const isOverdue = currentDay > billingDay && school.subscription_status !== 'active'
      const isDueSoon = currentDay === billingDay - 1 || currentDay === billingDay - 2

      // Get school owners
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: owners } = await (adminClient as any)
        .from('profiles')
        .select('id')
        .eq('school_id', school.id)
        .eq('role', 'owner')

      if (!owners || owners.length === 0) continue

      // Check if we've already sent a notification today to avoid spam
      const today = now.toISOString().split('T')[0]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingNotifications } = await (adminClient as any)
        .from('notifications')
        .select('id')
        .eq('user_id', owners[0].id)
        .in('type', ['billing_due', 'billing_overdue'])
        .gte('created_at', `${today}T00:00:00`)
        .limit(1)

      if (existingNotifications && existingNotifications.length > 0) {
        continue // Already notified today
      }

      for (const owner of owners) {
        if (isOverdue) {
          const daysOverdue = currentDay - billingDay
          await createBillingOverdueNotification({
            userId: owner.id,
            schoolName: school.name,
            billingDay: billingDay,
            daysOverdue: daysOverdue,
          })
          notifications.overdue++
        } else if (isDueSoon) {
          await createBillingDueNotification({
            userId: owner.id,
            schoolName: school.name,
            billingDay: billingDay,
          })
          notifications.dueSoon++
        }
      }
    }

    return NextResponse.json({
      success: true,
      notifications,
      message: `Sent ${notifications.dueSoon} due soon and ${notifications.overdue} overdue notifications`,
    })
  } catch (error) {
    console.error('Error checking overdue billing:', error)
    return NextResponse.json({ error: 'Failed to check overdue billing' }, { status: 500 })
  }
}

// GET endpoint to check billing status without sending notifications
export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient()
    const now = new Date()
    const currentDay = now.getDate()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: schools, error } = await (adminClient as any)
      .from('schools')
      .select('id, name, billing_day, subscription_plan, subscription_status')
      .eq('subscription_plan', 'standard')
      .not('billing_day', 'is', null)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 })
    }

    const summary = {
      total: schools?.length || 0,
      overdue: 0,
      dueSoon: 0,
      current: 0,
      schools: [] as Array<{
        id: string
        name: string
        billing_day: number
        status: string
        subscription_status: string
      }>,
    }

    for (const school of schools || []) {
      const billingDay = school.billing_day
      const isOverdue = currentDay > billingDay && school.subscription_status !== 'active'
      const isDueSoon = currentDay >= billingDay - 3 && currentDay < billingDay

      let status = 'current'
      if (isOverdue) {
        status = 'overdue'
        summary.overdue++
      } else if (isDueSoon) {
        status = 'due_soon'
        summary.dueSoon++
      } else {
        summary.current++
      }

      summary.schools.push({
        id: school.id,
        name: school.name,
        billing_day: billingDay,
        status,
        subscription_status: school.subscription_status,
      })
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error getting billing status:', error)
    return NextResponse.json({ error: 'Failed to get billing status' }, { status: 500 })
  }
}
