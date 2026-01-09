import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { post_id } = await request.json()

    if (!post_id) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 })
    }

    // Check if already liked
    const { data: existing } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', post_id)
      .eq('profile_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already liked' }, { status: 400 })
    }

    // Create like
    const { error } = await (adminClient as any)
      .from('likes')
      .insert({
        post_id,
        profile_id: user.id,
      })

    if (error) {
      console.error('Like error:', error)
      return NextResponse.json({ error: 'Failed to like post' }, { status: 500 })
    }

    // Create notification for post author (if not liking own post)
    const { data: postData } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', post_id)
      .single()

    const post = postData as { author_id: string } | null

    if (post && post.author_id !== user.id) {
      const { data: likerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      const likerName = (likerProfile as { full_name: string } | null)?.full_name || 'Someone'

      await (adminClient as any)
        .from('notifications')
        .insert({
          profile_id: post.author_id,
          type: 'like',
          title: 'New Like',
          content: `${likerName} liked your post`,
          related_id: post_id,
        })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Like API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { post_id } = await request.json()

    if (!post_id) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 })
    }

    // Delete like
    const { error } = await (adminClient as any)
      .from('likes')
      .delete()
      .eq('post_id', post_id)
      .eq('profile_id', user.id)

    if (error) {
      console.error('Unlike error:', error)
      return NextResponse.json({ error: 'Failed to unlike post' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unlike API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
