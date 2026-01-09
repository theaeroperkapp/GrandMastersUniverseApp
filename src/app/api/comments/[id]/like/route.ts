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
