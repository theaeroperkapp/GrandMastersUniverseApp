import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeString, isValidUUID, isValidLength } from '@/lib/validation'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Get comments for a post
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isValidUUID(postId)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 })
    }

    // Get comments with author info and like counts
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:profiles!comments_author_id_fkey(id, full_name, avatar_url, role),
        comment_likes(count)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }

    // Get user's likes for these comments
    const commentIds = comments?.map((c: any) => c.id) || []
    let userLikes: string[] = []

    if (commentIds.length > 0) {
      const { data: likes } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('profile_id', user.id)
        .in('comment_id', commentIds)

      userLikes = (likes as { comment_id: string }[] | null)?.map(l => l.comment_id) || []
    }

    // Add isLiked and likes_count to each comment
    const commentsWithLikes = comments?.map((comment: any) => ({
      ...comment,
      likes_count: comment.comment_likes?.[0]?.count || 0,
      isLiked: userLikes.includes(comment.id),
      comment_likes: undefined, // Remove the raw data
    })) || []

    return NextResponse.json(commentsWithLikes)
  } catch (error) {
    console.error('Comments GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create a comment
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isValidUUID(postId)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 })
    }

    const body = await request.json()
    const content = sanitizeString(body.content)
    const mentions: string[] = Array.isArray(body.mentions) ? body.mentions : []

    if (!content || !isValidLength(content, 1, 1000)) {
      return NextResponse.json({ error: 'Comment must be between 1 and 1000 characters' }, { status: 400 })
    }

    // Verify post exists and get author for notification
    const { data: postData } = await supabase
      .from('posts')
      .select('id, school_id, author_id')
      .eq('id', postId)
      .is('deleted_at', null)
      .single()

    const post = postData as { id: string; school_id: string; author_id: string } | null

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Create comment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: comment, error: commentError } = await (adminClient as any)
      .from('comments')
      .insert({
        post_id: postId,
        author_id: user.id,
        content,
      })
      .select(`
        *,
        author:profiles!comments_author_id_fkey(id, full_name, avatar_url, role)
      `)
      .single()

    if (commentError) {
      console.error('Error creating comment:', commentError)
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
    }

    // Get commenter name for notifications
    const { data: commenterProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const commenterName = (commenterProfile as { full_name: string } | null)?.full_name || 'Someone'

    // Create notification for post author (if not commenting on own post)
    if (post.author_id !== user.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from('notifications')
        .insert({
          user_id: post.author_id,
          type: 'comment',
          title: 'New Comment',
          message: `${commenterName} commented on your post`,
        })
    }

    // Send notifications to mentioned users
    if (mentions.length > 0) {
      const mentionNotifications = mentions
        .filter(mentionedUserId => mentionedUserId !== user.id && mentionedUserId !== post.author_id)
        .map(mentionedUserId => ({
          user_id: mentionedUserId,
          type: 'mention',
          title: 'You were mentioned',
          message: `${commenterName} mentioned you in a comment`,
        }))

      if (mentionNotifications.length > 0) {
        await (adminClient as any)
          .from('notifications')
          .insert(mentionNotifications)
      }
    }

    return NextResponse.json(comment)
  } catch (error) {
    console.error('Comments POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
