import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET handler for browser access
export async function GET() {
  return syncProfiles()
}

export async function POST() {
  return syncProfiles()
}

async function syncProfiles() {
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyAdminClient = adminClient as any
      const metadata = user.user_metadata || {}

      if (!existingProfile) {
        // Create missing profile from user metadata
        const { error: insertError } = await anyAdminClient
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
        // Check if profile needs school_id update
        const { data: fullProfile } = await anyAdminClient
          .from('profiles')
          .select('school_id')
          .eq('id', user.id)
          .single()

        if (!fullProfile?.school_id && metadata.school_id) {
          // Update profile with school_id from metadata
          const { error: updateError } = await anyAdminClient
            .from('profiles')
            .update({
              school_id: metadata.school_id,
              role: metadata.role || fullProfile?.role || 'student',
            })
            .eq('id', user.id)

          if (updateError) {
            results.push({
              email: user.email || 'unknown',
              status: 'update_error',
              error: updateError.message
            })
          } else {
            results.push({
              email: user.email || 'unknown',
              status: 'updated_school_id'
            })
          }
        } else {
          results.push({
            email: user.email || 'unknown',
            status: 'already_exists'
          })
        }
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
