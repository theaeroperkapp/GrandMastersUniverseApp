import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { SchoolFeaturesClient } from '@/components/admin/school-features-client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SchoolFeaturesPage({ params }: PageProps) {
  const { id: schoolId } = await params
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const profileData = profile as { role: string } | null
  if (!profileData || profileData.role !== 'admin') {
    redirect('/feed')
  }

  // Fetch school with subscription info using the authenticated client
  const { data: schoolData, error: schoolError } = await supabase
    .from('schools')
    .select('*')
    .eq('id', schoolId)
    .single()

  if (schoolError || !schoolData) {
    redirect('/admin/schools')
  }

  // Type assertion after null check
  const schoolRecord = schoolData as {
    id: string
    name: string
    subdomain: string
    subscription_status: string | null
    subscription_plan: string | null
    trial_ends_at: string | null
    billing_day: number | null
    created_at: string | null
  }

  const adminClient = createAdminClient()

  // Get student count for this school
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: studentCount } = await (adminClient as any)
    .from('student_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)

  // Ensure school has all required properties with defaults
  const school = {
    id: schoolRecord.id,
    name: schoolRecord.name,
    subdomain: schoolRecord.subdomain,
    subscription_status: schoolRecord.subscription_status || 'trial',
    subscription_plan: schoolRecord.subscription_plan || null,
    trial_ends_at: schoolRecord.trial_ends_at || null,
    student_count: studentCount || 0,
    billing_day: schoolRecord.billing_day ?? undefined,
    created_at: schoolRecord.created_at ?? undefined,
  }

  // Fetch available features (table may not exist yet if migration not run)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: features } = await (adminClient as any)
    .from('platform_features')
    .select('*')
    .eq('is_available', true)
    .order('sort_order', { ascending: true })

  // Fetch current subscriptions for this school
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subscriptions } = await (adminClient as any)
    .from('school_feature_subscriptions')
    .select('*')
    .eq('school_id', schoolId)

  // Fetch payment history
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: payments } = await (adminClient as any)
    .from('platform_payments')
    .select('*')
    .eq('school_id', schoolId)
    .order('paid_at', { ascending: false })
    .limit(20)

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <Link
          href="/admin/schools"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Schools
        </Link>
        <h1 className="text-2xl font-bold">{school.name}</h1>
        <p className="text-gray-500">{school.subdomain}.grandmastersuniverse.com</p>
        <p className="text-sm text-gray-400 mt-1">Subscription & Features</p>
      </div>

      <SchoolFeaturesClient
        school={school}
        availableFeatures={features || []}
        currentSubscriptions={subscriptions || []}
        paymentHistory={payments || []}
      />
    </div>
  )
}
