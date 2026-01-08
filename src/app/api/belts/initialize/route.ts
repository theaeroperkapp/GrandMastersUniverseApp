import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST - Initialize school belts by copying defaults
export async function POST() {
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

    // Check if school already has belts
    const { data: existingBelts } = await (adminClient as any)
      .from('belt_ranks')
      .select('id')
      .eq('school_id', profileData.school_id)
      .limit(1)

    if (existingBelts && existingBelts.length > 0) {
      return NextResponse.json({ message: 'School already has belts', initialized: false })
    }

    // Get default belts
    const { data: defaultBelts } = await (adminClient as any)
      .from('belt_ranks')
      .select('name, color, display_order, stripe_count, stripe_color')
      .eq('is_default', true)
      .order('display_order')

    if (!defaultBelts || defaultBelts.length === 0) {
      return NextResponse.json({ error: 'No default belts found' }, { status: 500 })
    }

    // Copy defaults to school
    const newBelts = defaultBelts.map((belt: any) => ({
      school_id: profileData.school_id,
      name: belt.name,
      color: belt.color,
      display_order: belt.display_order,
      stripe_count: belt.stripe_count || 0,
      stripe_color: belt.stripe_color || '#000000',
      is_default: false,
    }))

    const { data: createdBelts, error } = await (adminClient as any)
      .from('belt_ranks')
      .insert(newBelts)
      .select()

    if (error) {
      console.error('Error creating belts:', error)
      return NextResponse.json({ error: 'Failed to initialize belts' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Belts initialized successfully',
      initialized: true,
      belts: createdBelts
    })
  } catch (error) {
    console.error('Initialize belts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
