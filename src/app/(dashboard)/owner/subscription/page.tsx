import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { SubscriptionClient } from '@/components/owner/subscription-client'

interface ProfileData {
  role: string
  school_id: string | null
}

interface SchoolData {
  id: string
  name: string
  stripe_customer_id: string | null
  stripe_account_id: string | null
  subscription_status: string
  subscription_plan: string | null
  trial_ends_at: string | null
  subscription_ends_at: string | null
  billing_day: number | null
  last_payment_at?: string | null
}

export default async function SubscriptionPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, school_id')
    .eq('id', user.id)
    .single()

  const profileData = profile as ProfileData | null

  if (!profileData || profileData.role !== 'owner') {
    redirect('/feed')
  }

  if (!profileData.school_id) {
    redirect('/feed')
  }

  // Get school subscription info
  const { data: school } = await supabase
    .from('schools')
    .select('id, name, stripe_customer_id, stripe_account_id, subscription_status, subscription_plan, trial_ends_at, subscription_ends_at, billing_day')
    .eq('id', profileData.school_id)
    .single()

  const schoolRecord = school as SchoolData | null

  if (!schoolRecord) {
    redirect('/feed')
  }

  // Get the latest payment for this school (use admin client to bypass RLS)
  const adminClient = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: latestPayment } = await (adminClient as any)
    .from('platform_payments')
    .select('paid_at')
    .eq('school_id', profileData.school_id)
    .eq('status', 'succeeded')
    .order('paid_at', { ascending: false })
    .limit(1)
    .single()

  const schoolData: SchoolData = {
    ...schoolRecord,
    last_payment_at: (latestPayment as { paid_at: string } | null)?.paid_at || null,
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-gray-600">Manage your school&apos;s subscription plan</p>
      </div>

      <SubscriptionClient
        school={schoolData}
        userEmail={user.email || ''}
      />
    </div>
  )
}
