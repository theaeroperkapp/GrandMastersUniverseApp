import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/navbar'
import { Sidebar } from '@/components/layout/sidebar'
import type { UserRole } from '@/types/database'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profileData = profile as {
    id: string
    full_name: string
    avatar_url: string | null
    role: UserRole
    school_id: string | null
    is_approved: boolean
    sub_roles: string[] | null
  } | null

  if (!profileData) {
    redirect('/login')
  }

  // Check if user is approved
  if (!profileData.is_approved && profileData.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Pending Approval</h1>
          <p className="text-gray-600 mb-4">
            Your account is waiting for approval from the school administrator.
            You'll receive an email once your account is approved.
          </p>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="text-red-600 hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Get unread notifications count
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', user.id)
    .eq('is_read', false)

  // Get unread messages count
  const { count: unreadMessages } = await supabase
    .from('messages')
    .select('*, conversations!inner(*)', { count: 'exact', head: true })
    .eq('is_read', false)
    .neq('sender_id', user.id)
    .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`, { foreignTable: 'conversations' })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        user={{
          id: profileData.id,
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url,
          role: profileData.role,
          school_id: profileData.school_id,
        }}
        unreadNotifications={unreadNotifications || 0}
        unreadMessages={unreadMessages || 0}
      />
      <div className="flex">
        <Sidebar role={profileData.role} />
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
