import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidUUID } from '@/lib/validation'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Get a single post with like status
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

    // Get post with author
    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role)
      `)
      .eq('id', postId)
      .is('deleted_at', null)
      .single()

    if (error || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check if user liked this post
    const { data: like } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('profile_id', user.id)
      .single()

    // Get like count
    const { count: likeCount } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)

    // Get current user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      post,
      isLiked: !!like,
      likeCount: likeCount || 0,
      currentUser: {
        id: user.id,
        role: (profile as { role: string } | null)?.role || 'student',
      },
    })
  } catch (error) {
    console.error('Post GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete a post
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Get post to check ownership
    const { data: postData } = await supabase
      .from('posts')
      .select('author_id, school_id')
      .eq('id', postId)
      .single()

    const post = postData as { author_id: string; school_id: string } | null

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Get user's role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: string } | null

    // Check if user can delete
    const canDelete = post.author_id === user.id ||
      profileData?.role === 'owner' ||
      profileData?.role === 'admin'

    if (!canDelete) {
      return NextResponse.json({ error: 'Not authorized to delete this post' }, { status: 403 })
    }

    // Soft delete
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (adminClient as any)
      .from('posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', postId)

    if (deleteError) {
      console.error('Error deleting post:', deleteError)
      return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Post DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
