import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const includeDefault = searchParams.get('include_default') !== 'false'

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('belt_ranks')
      .select('*')
      .order('display_order')

    if (schoolId) {
      if (includeDefault) {
        query = query.or(`school_id.eq.${schoolId},is_default.eq.true`)
      } else {
        query = query.eq('school_id', schoolId)
      }
    } else if (includeDefault) {
      query = query.eq('is_default', true)
    }

    const { data: belts, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch belt ranks' }, { status: 500 })
    }

    return NextResponse.json(belts)
  } catch (error) {
    console.error('Get belts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is owner or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: string; school_id: string | null } | null
    if (!profileData || (profileData.role !== 'owner' && profileData.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { school_id, name, color, display_order, stripe_count, stripe_color, parent_belt_id } = await request.json()

    if (!school_id || !name || !color) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: belt, error } = await (adminClient as any)
      .from('belt_ranks')
      .insert({
        school_id,
        name,
        color,
        display_order: display_order || 99,
        is_default: false,
        stripe_count: stripe_count || 0,
        stripe_color: stripe_color || '#000000',
        parent_belt_id: parent_belt_id || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Create belt error:', error)
      return NextResponse.json({ error: 'Failed to create belt rank' }, { status: 500 })
    }

    return NextResponse.json(belt)
  } catch (error) {
    console.error('Create belt API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
