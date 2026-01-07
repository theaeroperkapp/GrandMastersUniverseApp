import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FeedClient } from '@/components/feed/feed-client'

export default async function FeedPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, schools(*)')
    .eq('id', user.id)
    .single()

  const profileData = profile as {
    id: string
    full_name: string
    avatar_url: string | null
    role: string
    school_id: string | null
    schools: any
  } | null

  if (!profileData?.school_id) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-2">No School Assigned</h1>
        <p className="text-gray-600">Please contact support to get assigned to a school.</p>
      </div>
    )
  }

  // Get posts for this school
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      *,
      author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role),
      comments(count),
      likes(count)
    `)
    .eq('school_id', profileData.school_id)
    .is('deleted_at', null)
    .order('is_announcement', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20)

  // Get user's post count for this month
  const yearMonth = new Date().toISOString().slice(0, 7)
  const { data: postCount } = await supabase
    .from('post_counts')
    .select('count')
    .eq('profile_id', user.id)
    .eq('school_id', profileData.school_id)
    .eq('year_month', yearMonth)
    .single()

  // Get school post limit
  const { data: school } = await supabase
    .from('schools')
    .select('monthly_post_limit')
    .eq('id', profileData.school_id)
    .single()

  const schoolData = school as { monthly_post_limit: number } | null
  const postCountData = postCount as { count: number } | null

  return (
    <div className="max-w-2xl mx-auto">
      <FeedClient
        initialPosts={posts as any[] || []}
        currentUser={{
          id: profileData.id,
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url,
          role: profileData.role as any,
          school_id: profileData.school_id,
        }}
        postsUsed={postCountData?.count || 0}
        postLimit={schoolData?.monthly_post_limit || 4}
      />
    </div>
  )
}
