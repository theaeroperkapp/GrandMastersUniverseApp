import { createAdminClient } from '@/lib/supabase/admin'

interface PaymentNotificationParams {
  userId: string
  success: boolean
  amount: number
  description: string
  relatedId?: string
}

export async function createPaymentNotification({
  userId,
  success,
  amount,
  description,
  relatedId,
}: PaymentNotificationParams) {
  const adminClient = createAdminClient()

  const title = success ? 'Payment Successful' : 'Payment Failed'
  const formattedAmount = `$${(amount / 100).toFixed(2)}`
  const content = success
    ? `Your payment of ${formattedAmount} for ${description} was successful.`
    : `Your payment of ${formattedAmount} for ${description} failed. Please try again.`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any).from('notifications').insert({
    user_id: userId,
    type: success ? 'payment_success' : 'payment_failed',
    title,
    message: content,
    is_read: false,
  })

  if (error) {
    console.error('Failed to create payment notification:', error)
  }
}

export async function createGenericNotification({
  userId,
  type,
  title,
  content,
  relatedId,
}: {
  userId: string
  type: string
  title: string
  content: string
  relatedId?: string
}) {
  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any).from('notifications').insert({
    user_id: userId,
    type,
    title,
    message: content,
    is_read: false,
  })

  if (error) {
    console.error('Failed to create notification:', error)
  }
}

// Billing-related notifications

interface BillingNotificationParams {
  userId: string
  schoolName: string
  amount?: number
  billingDay?: number
  daysOverdue?: number
}

export async function createBillingDueNotification({
  userId,
  schoolName,
  amount = 9900, // Default $99.00 in cents
  billingDay,
}: BillingNotificationParams) {
  const adminClient = createAdminClient()
  const formattedAmount = `$${(amount / 100).toFixed(2)}`

  const ordinalSuffix = (day: number) => {
    if (day === 1 || day === 21) return 'st'
    if (day === 2 || day === 22) return 'nd'
    if (day === 3 || day === 23) return 'rd'
    return 'th'
  }

  const dayText = billingDay ? `on the ${billingDay}${ordinalSuffix(billingDay)}` : 'soon'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any).from('notifications').insert({
    user_id: userId,
    type: 'billing_due',
    title: 'Payment Due Soon',
    message: `Your ${formattedAmount} monthly subscription payment for ${schoolName} is due ${dayText}. Please ensure your payment method is up to date.`,
    is_read: false,
  })

  if (error) {
    console.error('Failed to create billing due notification:', error)
  }
}

export async function createBillingOverdueNotification({
  userId,
  schoolName,
  amount = 9900,
  billingDay,
  daysOverdue = 0,
}: BillingNotificationParams) {
  const adminClient = createAdminClient()
  const formattedAmount = `$${(amount / 100).toFixed(2)}`

  const ordinalSuffix = (day: number) => {
    if (day === 1 || day === 21) return 'st'
    if (day === 2 || day === 22) return 'nd'
    if (day === 3 || day === 23) return 'rd'
    return 'th'
  }

  const dayText = billingDay ? `on the ${billingDay}${ordinalSuffix(billingDay)}` : ''
  const overdueText = daysOverdue > 0 ? ` (${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue)` : ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any).from('notifications').insert({
    user_id: userId,
    type: 'billing_overdue',
    title: 'Payment Overdue',
    message: `Your ${formattedAmount} monthly subscription payment for ${schoolName} was due ${dayText}${overdueText}. Please make a payment immediately to avoid service interruption.`,
    is_read: false,
  })

  if (error) {
    console.error('Failed to create billing overdue notification:', error)
  }
}

export async function createPaymentFailedNotification({
  userId,
  schoolName,
  amount = 9900,
}: BillingNotificationParams) {
  const adminClient = createAdminClient()
  const formattedAmount = `$${(amount / 100).toFixed(2)}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any).from('notifications').insert({
    user_id: userId,
    type: 'payment_failed',
    title: 'Payment Failed',
    message: `Your ${formattedAmount} subscription payment for ${schoolName} failed. Please update your payment method to continue using all features.`,
    is_read: false,
  })

  if (error) {
    console.error('Failed to create payment failed notification:', error)
  }
}

export async function createCardExpiringNotification({
  userId,
  cardLast4,
  expiryMonth,
  expiryYear,
}: {
  userId: string
  cardLast4: string
  expiryMonth: number
  expiryYear: number
}) {
  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any).from('notifications').insert({
    user_id: userId,
    type: 'card_expiring',
    title: 'Card Expiring Soon',
    message: `Your card ending in ${cardLast4} will expire on ${expiryMonth}/${expiryYear}. Please update your payment method to avoid service interruption.`,
    is_read: false,
  })

  if (error) {
    console.error('Failed to create card expiring notification:', error)
  }
}
