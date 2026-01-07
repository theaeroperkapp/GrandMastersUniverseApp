import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClassesClient } from '@/components/owner/classes-client'

interface ProfileData {
  role: string
  school_id: string | null
}

export default async function ClassesPage() {
  const supabase = await createClient()

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

  // Get class schedules for this school
  const { data: classes } = await supabase
    .from('class_schedules')
    .select('*')
    .eq('school_id', profileData.school_id)
    .order('day_of_week')
    .order('start_time')

  // Get instructors (owners and staff with instructor role)
  const { data: instructors } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('school_id', profileData.school_id)
    .in('role', ['owner', 'parent', 'student'])
    .eq('is_approved', true)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Class Schedule</h1>
        <p className="text-gray-600">Manage your school's class schedule</p>
      </div>

      <ClassesClient 
        initialClasses={classes || []} 
        instructors={instructors || []}
        schoolId={profileData.school_id}
      />
    </div>
  )
}
