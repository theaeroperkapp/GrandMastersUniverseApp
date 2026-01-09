import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidUUID } from '@/lib/validation'

interface RouteParams {
  params: Promise<{ id: string; commentId: string }>
}

// Delete a comment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId, commentId } = await params
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isValidUUID(postId) || !isValidUUID(commentId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    // Get comment to check ownership
    const { data: commentData } = await supabase
      .from('comments')
      .select('author_id, post_id')
      .eq('id', commentId)
      .single()

    const comment = commentData as { author_id: string; post_id: string } | null

    if (!comment || comment.post_id !== postId) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Get user's role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: string } | null

    // Check if user can delete
    const canDelete = comment.author_id === user.id ||
      profileData?.role === 'owner' ||
      profileData?.role === 'admin'

    if (!canDelete) {
      return NextResponse.json({ error: 'Not authorized to delete this comment' }, { status: 403 })
    }

    // Delete comment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (adminClient as any)
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (deleteError) {
      console.error('Error deleting comment:', deleteError)
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Comment DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
