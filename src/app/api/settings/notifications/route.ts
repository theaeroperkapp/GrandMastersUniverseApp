import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      email_announcements,
      email_events,
      email_messages,
      email_class_reminders,
    } = body

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    // Upsert notification settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertError } = await (adminClient as any)
      .from('user_settings')
      .upsert({
        user_id: user.id,
        email_announcements: email_announcements ?? true,
        email_events: email_events ?? true,
        email_messages: email_messages ?? true,
        email_class_reminders: email_class_reminders ?? true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (upsertError) {
      console.error('Error saving notifications:', upsertError)
      return NextResponse.json({ error: 'Failed to save notification settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notifications update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
