import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET - Fetch current belt settings for the school
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile and verify they're an owner
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: string; school_id: string | null } | null

    if (!profileData || (profileData.role !== 'owner' && profileData.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!profileData.school_id) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get school's disabled belts setting
    const { data: school } = await (adminClient as any)
      .from('schools')
      .select('disabled_default_belts')
      .eq('id', profileData.school_id)
      .single()

    // Get all default belts
    const { data: defaultBelts } = await supabase
      .from('belt_ranks')
      .select('id, name, color, display_order')
      .eq('is_default', true)
      .order('display_order')

    // Get school's custom belts
    const { data: customBelts } = await supabase
      .from('belt_ranks')
      .select('id, name, color, display_order')
      .eq('school_id', profileData.school_id)
      .order('display_order')

    return NextResponse.json({
      disabledBelts: school?.disabled_default_belts || [],
      defaultBelts: defaultBelts || [],
      customBelts: customBelts || [],
    })
  } catch (error) {
    console.error('Belt settings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update disabled belts for the school
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile and verify they're an owner
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: string; school_id: string | null } | null

    if (!profileData || (profileData.role !== 'owner' && profileData.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!profileData.school_id) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 })
    }

    const body = await request.json()
    const { disabledBelts } = body

    if (!Array.isArray(disabledBelts)) {
      return NextResponse.json({ error: 'disabledBelts must be an array' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Update school's disabled belts
    const { error: updateError } = await (adminClient as any)
      .from('schools')
      .update({ disabled_default_belts: disabledBelts })
      .eq('id', profileData.school_id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Belt settings PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
