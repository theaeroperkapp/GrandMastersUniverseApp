import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateSubdomain } from '@/lib/utils'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: string } | null
    if (!profileData || profileData.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { school_id, subdomain } = await request.json()

    if (!school_id || !subdomain) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate subdomain format
    if (!validateSubdomain(subdomain)) {
      return NextResponse.json({ error: 'Invalid subdomain format' }, { status: 400 })
    }

    // Check if subdomain is already taken
    const { data: existing } = await (adminClient as any)
      .from('schools')
      .select('id')
      .eq('subdomain', subdomain)
      .neq('id', school_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Subdomain already in use' }, { status: 400 })
    }

    // Update subdomain
    const { error } = await (adminClient as any)
      .from('schools')
      .update({ subdomain })
      .eq('id', school_id)

    if (error) {
      console.error('Subdomain update error:', error)
      return NextResponse.json({ error: 'Failed to update subdomain' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Subdomain API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
