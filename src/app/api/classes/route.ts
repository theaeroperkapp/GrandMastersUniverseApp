import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('class_schedules')
      .select('*')
      .order('day_of_week')
      .order('start_time')

    if (schoolId) {
      query = query.eq('school_id', schoolId)
    }

    const { data: classes, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 })
    }

    return NextResponse.json(classes)
  } catch (error) {
    console.error('Get classes error:', error)
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: string; school_id: string | null } | null

    if (!profileData || (profileData.role !== 'owner' && profileData.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { school_id, name, description, day_of_week, start_time, end_time, instructor_id, max_capacity, location } = body

    if (!school_id || !name || day_of_week === undefined || !start_time || !end_time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: newClass, error } = await (adminClient as any)
      .from('class_schedules')
      .insert({
        school_id,
        name,
        description,
        day_of_week,
        start_time,
        end_time,
        instructor_id,
        max_capacity,
        location,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Create class error:', error)
      return NextResponse.json({ error: 'Failed to create class' }, { status: 500 })
    }

    return NextResponse.json(newClass, { status: 201 })
  } catch (error) {
    console.error('Create class error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
