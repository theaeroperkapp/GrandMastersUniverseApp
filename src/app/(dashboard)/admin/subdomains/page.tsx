import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SubdomainsClient } from '@/components/admin/subdomains-client'

export default async function SubdomainsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const profileData = profile as { role: string } | null
  if (!profileData || profileData.role !== 'admin') {
    redirect('/feed')
  }

  // Get all schools with subdomains
  const { data: schools } = await supabase
    .from('schools')
    .select('id, name, subdomain, subscription_status, created_at')
    .order('subdomain')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subdomain Management</h1>
        <p className="text-gray-600">Manage school subdomains</p>
      </div>

      <SubdomainsClient schools={schools || []} />
    </div>
  )
}
