import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  try {
    const adminClient = createAdminClient()

    // Get all auth users
    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers()

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    const results: Array<{ email: string; status: string; error?: string }> = []

    for (const user of authData.users) {
      // Check if profile exists
      const { data: existingProfile } = await adminClient
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingProfile) {
        // Create missing profile from user metadata
        const metadata = user.user_metadata || {}

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insertError } = await (adminClient as any)
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: metadata.full_name || user.email || 'Unknown',
            school_id: metadata.school_id || null,
            role: metadata.role || 'student',
            is_approved: false,
          })

        if (insertError) {
          results.push({
            email: user.email || 'unknown',
            status: 'error',
            error: insertError.message
          })
        } else {
          results.push({
            email: user.email || 'unknown',
            status: 'created'
          })
        }
      } else {
        results.push({
          email: user.email || 'unknown',
          status: 'already_exists'
        })
      }
    }

    return NextResponse.json({
      message: 'Sync complete',
      results
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
