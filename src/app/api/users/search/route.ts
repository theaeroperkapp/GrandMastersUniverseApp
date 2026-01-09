import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.toLowerCase() || ''

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user's school
    const { data: profileData } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single()

    const profile = profileData as { school_id: string | null } | null

    if (!profile?.school_id) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 })
    }

    // Search users in the same school
    let queryBuilder = supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role')
      .eq('school_id', profile.school_id)
      .eq('is_approved', true)
      .neq('id', user.id) // Exclude current user
      .order('full_name')
      .limit(10)

    if (query) {
      queryBuilder = queryBuilder.ilike('full_name', `%${query}%`)
    }

    const { data: users, error } = await queryBuilder

    if (error) {
      console.error('Error searching users:', error)
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 })
    }

    return NextResponse.json(users || [])
  } catch (error) {
    console.error('User search API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
