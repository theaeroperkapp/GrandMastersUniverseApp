import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateClassInput, sanitizeString, formatValidationErrors } from '@/lib/validation'

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

    // Sanitize inputs
    const sanitizedInput = {
      school_id: sanitizeString(school_id),
      name: sanitizeString(name),
      description: description ? sanitizeString(description) : null,
      day_of_week: typeof day_of_week === 'number' ? day_of_week : parseInt(day_of_week),
      start_time: sanitizeString(start_time),
      end_time: sanitizeString(end_time),
      instructor_id: instructor_id ? sanitizeString(instructor_id) : null,
      max_capacity: max_capacity ? parseInt(max_capacity) : null,
      location: location ? sanitizeString(location) : null,
    }

    // Validate inputs
    const validation = validateClassInput(sanitizedInput)
    if (!validation.isValid) {
      return NextResponse.json({ error: formatValidationErrors(validation.errors) }, { status: 400 })
    }

    const { data: newClass, error } = await (adminClient as any)
      .from('class_schedules')
      .insert({
        school_id: sanitizedInput.school_id,
        name: sanitizedInput.name,
        description: sanitizedInput.description,
        day_of_week: sanitizedInput.day_of_week,
        start_time: sanitizedInput.start_time,
        end_time: sanitizedInput.end_time,
        instructor_id: sanitizedInput.instructor_id,
        max_capacity: sanitizedInput.max_capacity,
        location: sanitizedInput.location,
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
