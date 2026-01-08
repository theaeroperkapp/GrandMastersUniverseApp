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
    profile_id: userId,
    type: success ? 'payment_success' : 'payment_failed',
    title,
    content,
    related_id: relatedId,
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
    profile_id: userId,
    type,
    title,
    content,
    related_id: relatedId,
    is_read: false,
  })

  if (error) {
    console.error('Failed to create notification:', error)
  }
}
