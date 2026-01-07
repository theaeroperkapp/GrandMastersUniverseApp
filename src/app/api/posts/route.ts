import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadImage } from '@/lib/cloudinary'
import { getYearMonth } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const content = formData.get('content') as string
    const schoolId = formData.get('school_id') as string
    const shareToFacebook = formData.get('share_to_facebook') === 'true'
    const image = formData.get('image') as File | null

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: string; school_id: string | null } | null
    if (!profileData || profileData.school_id !== schoolId) {
      return NextResponse.json({ error: 'Invalid school' }, { status: 400 })
    }

    // Check post limit for non-owners (only if posting with image)
    if (image && profileData.role !== 'owner' && profileData.role !== 'admin') {
      const yearMonth = getYearMonth()

      // Get school's post limit
      const { data: school } = await supabase
        .from('schools')
        .select('monthly_post_limit')
        .eq('id', schoolId)
        .single()

      const schoolData = school as { monthly_post_limit: number } | null
      const postLimit = schoolData?.monthly_post_limit || 4

      // Get current post count
      const { data: postCount } = await supabase
        .from('post_counts')
        .select('count')
        .eq('profile_id', user.id)
        .eq('school_id', schoolId)
        .eq('year_month', yearMonth)
        .single()

      const postCountData = postCount as { count: number } | null
      if ((postCountData?.count || 0) >= postLimit) {
        return NextResponse.json(
          { error: `Monthly post limit reached (${postLimit} posts)` },
          { status: 400 }
        )
      }
    }

    // Upload image if provided
    let imageUrl = null
    if (image) {
      const buffer = await image.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const dataUri = `data:${image.type};base64,${base64}`

      const result = await uploadImage(dataUri, 'posts')
      imageUrl = result.url
    }

    // Create post
    const { data: post, error: postError } = await (adminClient as any)
      .from('posts')
      .insert({
        school_id: schoolId,
        author_id: user.id,
        content,
        image_url: imageUrl,
        share_to_facebook: shareToFacebook,
      })
      .select(`
        *,
        author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role)
      `)
      .single()

    if (postError) {
      console.error('Post creation error:', postError)
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    }

    // Update post count (only for image posts)
    if (image && profileData.role !== 'owner' && profileData.role !== 'admin') {
      const yearMonth = getYearMonth()

      await (adminClient as any)
        .from('post_counts')
        .upsert(
          {
            profile_id: user.id,
            school_id: schoolId,
            year_month: yearMonth,
            count: 1,
          },
          {
            onConflict: 'profile_id,school_id,year_month',
          }
        )

      // Increment count if already exists
      await (adminClient as any).rpc('increment_post_count', {
        p_profile_id: user.id,
        p_school_id: schoolId,
        p_year_month: yearMonth,
      })
    }

    return NextResponse.json({
      ...post,
      comments: [{ count: 0 }],
      likes: [{ count: 0 }],
    })
  } catch (error) {
    console.error('Post API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const query = supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role),
        comments(count),
        likes(count)
      `)
      .is('deleted_at', null)
      .order('is_announcement', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20)

    if (schoolId) {
      query.eq('school_id', schoolId)
    }

    const { data: posts, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }

    return NextResponse.json(posts)
  } catch (error) {
    console.error('Get posts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
