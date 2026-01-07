import { createClient } from '@/lib/supabase/server'
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
  stripe_subscription_id: string | null
  subscription_status: string
  subscription_plan: string | null
  trial_ends_at: string | null
  current_period_end: string | null
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
    .select('id, name, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_plan, trial_ends_at, current_period_end')
    .eq('id', profileData.school_id)
    .single()

  const schoolData = school as SchoolData | null

  if (!schoolData) {
    redirect('/feed')
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
