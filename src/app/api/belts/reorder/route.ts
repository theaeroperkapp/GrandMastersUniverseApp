import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PATCH - Reorder belts for a school
export async function PATCH(request: NextRequest) {
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

    if (!profileData.school_id) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 })
    }

    const { beltIds } = await request.json()

    if (!Array.isArray(beltIds)) {
      return NextResponse.json({ error: 'beltIds must be an array' }, { status: 400 })
    }

    // Update display_order for each belt
    const updates = beltIds.map((id: string, index: number) =>
      (adminClient as any)
        .from('belt_ranks')
        .update({ display_order: index + 1 })
        .eq('id', id)
        .eq('school_id', profileData.school_id)
    )

    await Promise.all(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reorder belts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
