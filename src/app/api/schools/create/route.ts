import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, subdomain, email } = await request.json()

    // Validate required fields
    if (!name || !subdomain || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the email is in the approved waitlist
    const { data: waitlistEntry, error: waitlistError } = await adminClient
      .from('waitlist')
      .select('id, status')
      .eq('email', email.toLowerCase())
      .eq('status', 'approved')
      .single()

    const waitlistData = waitlistEntry as { id: string; status: string } | null

    if (waitlistError || !waitlistData) {
      return NextResponse.json({
        error: 'Your email is not approved. Please apply through the waitlist first.'
      }, { status: 403 })
    }

    // Check if subdomain is already taken
    const { data: existingSchool } = await adminClient
      .from('schools')
      .select('id')
      .eq('subdomain', subdomain.toLowerCase())
      .single()

    if (existingSchool) {
      return NextResponse.json({ error: 'This subdomain is already taken' }, { status: 400 })
    }

    // Create the school using admin client
    const { data: school, error: schoolError } = await adminClient
      .from('schools')
      .insert({
        name: name.trim(),
        subdomain: subdomain.toLowerCase().trim(),
        owner_id: user.id,
        subscription_status: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        monthly_post_limit: 100,
        announcement_limit: 50,
      } as never)
      .select()
      .single()

    const schoolData = school as { id: string; name: string; subdomain: string } | null

    if (schoolError || !schoolData) {
      console.error('School creation error:', schoolError)
      return NextResponse.json({ error: 'Failed to create school' }, { status: 500 })
    }

    // Update the user's profile with school_id and set as owner
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        school_id: schoolData.id,
        role: 'owner',
        is_approved: true,
      } as never)
      .eq('id', user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      // Try to clean up the school if profile update fails
      await adminClient.from('schools').delete().eq('id', schoolData.id)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    // Mark waitlist entry as used (optional: you could delete it or add a 'used' status)
    await adminClient
      .from('waitlist')
      .update({
        notes: `School created: ${schoolData.id}`,
        reviewed_at: new Date().toISOString()
      } as never)
      .eq('id', waitlistData.id)

    return NextResponse.json({
      success: true,
      school: { id: schoolData.id, name: schoolData.name, subdomain: schoolData.subdomain }
    })
  } catch (error) {
    console.error('School creation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
