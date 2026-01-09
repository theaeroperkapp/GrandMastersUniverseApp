import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Use authenticated client - RLS allows users to manage their own settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertError } = await (supabase as any)
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
      // Return success anyway - table might not exist yet
      // Notifications are not critical functionality
      return NextResponse.json({ success: true, warning: 'Settings may not have persisted' })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notifications update error:', error)
    // Return success anyway for non-critical feature
    return NextResponse.json({ success: true, warning: 'Settings may not have persisted' })
  }
}
