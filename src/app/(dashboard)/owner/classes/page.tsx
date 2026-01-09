import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ClassesClient } from '@/components/owner/classes-client'

// Disable caching to always fetch fresh data
export const dynamic = 'force-dynamic'

interface ProfileData {
  role: string
  school_id: string | null
}

export default async function ClassesPage() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, school_id')
    .eq('id', user.id)
    .single()

  const profileData = profile as ProfileData | null

  if (!profileData || (profileData.role !== 'owner' && profileData.role !== 'admin')) {
    redirect('/feed')
  }

  if (!profileData.school_id) {
    redirect('/feed')
  }

  // Get class schedules for this school (use admin client to bypass RLS)
  const { data: classes, error: classesError } = await adminClient
    .from('class_schedules')
    .select('*')
    .eq('school_id', profileData.school_id)
    .order('day_of_week')
    .order('start_time')

  if (classesError) {
    console.error('Error fetching classes:', classesError)
  }

  // Get instructors (owners and staff with instructor role)
  const { data: instructors } = await adminClient
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('school_id', profileData.school_id)
    .in('role', ['owner', 'parent', 'student'])
    .eq('is_approved', true)

  // Get default belts
  const { data: defaultBelts } = await adminClient
    .from('belt_ranks')
    .select('id, name, color, display_order')
    .eq('is_default', true)
    .order('display_order')

  // Get custom belts for this school
  const { data: customBelts } = await adminClient
    .from('belt_ranks')
    .select('id, name, color, display_order')
    .eq('school_id', profileData.school_id)
    .eq('is_default', false)
    .order('display_order')

  // Combine both, with default belts first
  const belts = [...(defaultBelts || []), ...(customBelts || [])]

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Class Schedule</h1>
        <p className="text-gray-600 text-sm">Manage your school's class schedule</p>
      </div>

      <ClassesClient
        initialClasses={classes || []}
        instructors={instructors || []}
        belts={belts || []}
        schoolId={profileData.school_id}
      />
    </div>
  )
}
