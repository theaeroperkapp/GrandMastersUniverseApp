import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Like a comment
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: commentId } = await params
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if already liked
    const { data: existing } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('profile_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already liked' }, { status: 400 })
    }

    // Create like
    const { error } = await (adminClient as any)
      .from('comment_likes')
      .insert({
        comment_id: commentId,
        profile_id: user.id,
      })

    if (error) {
      console.error('Comment like error:', error)
      return NextResponse.json({ error: 'Failed to like comment' }, { status: 500 })
    }

    // Create notification for comment author (if not liking own comment)
    const { data: commentData } = await supabase
      .from('comments')
      .select('author_id')
      .eq('id', commentId)
      .single()

    const comment = commentData as { author_id: string } | null

    if (comment && comment.author_id !== user.id) {
      const { data: likerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      const likerName = (likerProfile as { full_name: string } | null)?.full_name || 'Someone'

      await (adminClient as any)
        .from('notifications')
        .insert({
          user_id: comment.author_id,
          type: 'like',
          title: 'Comment Liked',
          message: `${likerName} liked your comment`,
        })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Comment like API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Unlike a comment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: commentId } = await params
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete like
    const { error } = await (adminClient as any)
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('profile_id', user.id)

    if (error) {
      console.error('Comment unlike error:', error)
      return NextResponse.json({ error: 'Failed to unlike comment' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Comment unlike API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
