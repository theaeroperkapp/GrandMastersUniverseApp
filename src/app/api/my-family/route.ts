import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user's profile with family info
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, role, family_id, created_at')
      .eq('id', user.id)
      .single()

    const profile = profileData as {
      id: string
      full_name: string
      email: string
      avatar_url: string | null
      role: string
      family_id: string | null
      created_at: string
    } | null

    if (!profile) {
      return NextResponse.json({
        error: 'Profile not found',
        debug: { userId: user.id, profileError: profileError?.message }
      }, { status: 404 })
    }

    let familyId = profile.family_id

    // If no family_id, check if user is primary holder of a family
    if (!familyId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: primaryHolderFamily } = await (adminClient as any)
        .from('families')
        .select('id')
        .eq('primary_holder_id', user.id)
        .single()

      if (primaryHolderFamily) {
        familyId = primaryHolderFamily.id
      }
    }

    if (!familyId) {
      return NextResponse.json({ family: null, members: [], profile })
    }

    // Get family details (using admin client to bypass RLS)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: familyData } = await (adminClient as any)
      .from('families')
      .select('id, name, billing_email, primary_holder_id')
      .eq('id', familyId)
      .single()

    if (!familyData) {
      return NextResponse.json({ family: null, members: [], profile })
    }

    const family = familyData as {
      id: string
      name: string
      billing_email: string | null
      primary_holder_id: string
    }

    // Get all family members
    // Include both members with family_id set AND the primary holder
    const { data: membersData } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, role, created_at')
      .or(`family_id.eq.${familyId},id.eq.${family.primary_holder_id}`)
      .order('role')
      .order('full_name')

    const members = (membersData || []) as Array<{
      id: string
      full_name: string
      email: string
      avatar_url: string | null
      role: string
      created_at: string
    }>

    // For each member, fetch their student profile if they have one
    const membersWithStudentProfiles = await Promise.all(
      members.map(async (member) => {
        const { data: studentProfileData } = await supabase
          .from('student_profiles')
          .select('id, enrollment_date, belt_rank_id')
          .eq('profile_id', member.id)
          .single()

        let currentBelt = null
        if (studentProfileData) {
          const studentProfile = studentProfileData as { id: string; enrollment_date: string | null; belt_rank_id: string | null }
          if (studentProfile.belt_rank_id) {
            const { data: beltData } = await supabase
              .from('belt_ranks')
              .select('id, name, color')
              .eq('id', studentProfile.belt_rank_id)
              .single()
            currentBelt = beltData
          }
        }

        return {
          ...member,
          student_profile: studentProfileData ? {
            ...(studentProfileData as { id: string; enrollment_date: string | null; belt_rank_id: string | null }),
            current_belt: currentBelt,
          } : null,
        }
      })
    )

    return NextResponse.json({
      family,
      members: membersWithStudentProfiles,
      profile,
      isPrimaryHolder: family.primary_holder_id === user.id,
    })
  } catch (error) {
    console.error('My family error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
