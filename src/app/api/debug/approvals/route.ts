import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const adminClient = createAdminClient()

    // Get all profiles
    const { data: allProfiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, email, full_name, school_id, role, is_approved, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    // Get unapproved profiles specifically
    const { data: unapprovedProfiles, error: unapprovedError } = await adminClient
      .from('profiles')
      .select('id, email, full_name, school_id, role, is_approved, created_at')
      .eq('is_approved', false)
      .order('created_at', { ascending: false })

    // Get all schools
    const { data: schools, error: schoolsError } = await adminClient
      .from('schools')
      .select('id, name, subdomain')

    // Get auth users
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers()

    return NextResponse.json({
      allProfiles,
      profilesError,
      unapprovedProfiles,
      unapprovedError,
      schools,
      schoolsError,
      authUsers: authUsers?.users?.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        user_metadata: u.user_metadata,
      })),
      authError,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
