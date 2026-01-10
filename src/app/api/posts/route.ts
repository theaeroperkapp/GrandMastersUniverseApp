import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadImage } from '@/lib/cloudinary'
import { getYearMonth } from '@/lib/utils'
import { validatePostInput, sanitizeString, formatValidationErrors, isValidUUID } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const rawContent = formData.get('content') as string
    const rawSchoolId = formData.get('school_id') as string
    const shareToFacebook = formData.get('share_to_facebook') === 'true'
    const mentionsJson = formData.get('mentions') as string
    const image = formData.get('image') as File | null

    // Parse mentions
    let mentions: string[] = []
    try {
      mentions = mentionsJson ? JSON.parse(mentionsJson) : []
    } catch {
      mentions = []
    }

    // Sanitize inputs
    const content = sanitizeString(rawContent)
    const schoolId = sanitizeString(rawSchoolId)

    // Validate inputs (pass hasImage so content is optional if image provided)
    const validation = validatePostInput({ content, school_id: schoolId, hasImage: !!image })
    if (!validation.isValid) {
      return NextResponse.json({ error: formatValidationErrors(validation.errors) }, { status: 400 })
    }

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
      try {
        // Log image details for debugging
        console.log('Image upload attempt:', {
          name: image.name,
          type: image.type,
          size: image.size,
        })

        const buffer = await image.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        const dataUri = `data:${image.type};base64,${base64}`

        console.log('Uploading to Cloudinary...')
        const result = await uploadImage(dataUri, 'posts')
        imageUrl = result.url
        console.log('Upload successful:', imageUrl)
      } catch (uploadError: any) {
        console.error('Image upload error:', {
          message: uploadError?.message,
          name: uploadError?.name,
          stack: uploadError?.stack,
          httpCode: uploadError?.http_code,
          errorDetails: uploadError?.error,
        })

        // Extract meaningful error message
        let errorDetails = 'Unknown error'
        if (uploadError?.message) {
          errorDetails = uploadError.message
        } else if (uploadError?.error?.message) {
          errorDetails = uploadError.error.message
        } else if (typeof uploadError?.error === 'string') {
          errorDetails = uploadError.error
        }

        return NextResponse.json({
          error: 'Failed to upload image. Please try again.',
          details: errorDetails,
          code: uploadError?.http_code || uploadError?.error?.http_code,
          fullError: JSON.stringify(uploadError, Object.getOwnPropertyNames(uploadError))
        }, { status: 500 })
      }
    }

    // Create post (use null for empty content to allow image-only posts)
    const { data: post, error: postError } = await (adminClient as any)
      .from('posts')
      .insert({
        school_id: schoolId,
        author_id: user.id,
        content: content || null,
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

    // Send notifications to mentioned users
    if (mentions.length > 0) {
      const { data: authorProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      const authorName = (authorProfile as { full_name: string } | null)?.full_name || 'Someone'

      const notifications = mentions
        .filter(mentionedUserId => mentionedUserId !== user.id) // Don't notify self
        .map(mentionedUserId => ({
          user_id: mentionedUserId,
          type: 'mention',
          title: 'You were mentioned',
          message: `${authorName} mentioned you in a post`,
        }))

      if (notifications.length > 0) {
        await (adminClient as any)
          .from('notifications')
          .insert(notifications)
      }
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

    const { data: postsData, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const posts = postsData as any[] | null

    // Get user's likes to mark which posts they've liked
    const postIds = posts?.map(p => p.id) || []
    const { data: userLikesData } = await supabase
      .from('likes')
      .select('post_id')
      .eq('profile_id', user.id)
      .in('post_id', postIds)

    const userLikes = userLikesData as { post_id: string }[] | null
    const likedPostIds = new Set(userLikes?.map(l => l.post_id) || [])

    // Add isLiked flag to each post
    const postsWithLikeStatus = posts?.map(post => ({
      ...post,
      isLiked: likedPostIds.has(post.id),
    })) || []

    return NextResponse.json(postsWithLikeStatus)
  } catch (error) {
    console.error('Get posts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
