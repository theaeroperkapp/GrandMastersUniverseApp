import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    // Get user profile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profileData, error: profileError } = await (adminClient as any)
      .from('profiles')
      .select('id, full_name, email, phone, avatar_url')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    // Get notification settings (may not exist - table or record)
    let settingsData = null
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (adminClient as any)
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()
      settingsData = data
    } catch {
      // Table might not exist or no record found - that's ok
      console.log('user_settings not available, using defaults')
    }

    return NextResponse.json({
      profile: profileData,
      notifications: settingsData ? {
        email_announcements: settingsData.email_announcements ?? true,
        email_events: settingsData.email_events ?? true,
        email_messages: settingsData.email_messages ?? true,
        email_class_reminders: settingsData.email_class_reminders ?? true,
      } : {
        email_announcements: true,
        email_events: true,
        email_messages: true,
        email_class_reminders: true,
      },
    })
  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
