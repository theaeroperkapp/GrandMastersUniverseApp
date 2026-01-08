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

    // Get current user's profile with family info (using admin to bypass RLS)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profileData } = await (adminClient as any)
      .from('profiles')
      .select('id, full_name, email, avatar_url, role, phone, family_id, created_at')
      .eq('id', user.id)
      .single()

    const profile = profileData as {
      id: string
      full_name: string
      email: string
      avatar_url: string | null
      role: string
      phone: string | null
      family_id: string | null
      created_at: string
    } | null

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
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

    // Get family details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: familyData } = await (adminClient as any)
      .from('families')
      .select('id, name, billing_email, primary_holder_id')
      .eq('id', familyId)
      .single()

    if (!familyData) {
      return NextResponse.json({ family: null, members: [], profile })
    }

    // Get all family members
    // Include both members with family_id set AND the primary holder
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: membersData } = await (adminClient as any)
      .from('profiles')
      .select('id, full_name, email, avatar_url, role, phone, created_at')
      .or(`family_id.eq.${familyId},id.eq.${familyData.primary_holder_id}`)
      .order('role')
      .order('full_name')

    const members = membersData || []

    // For each member, fetch their student profile if they have one
    const membersWithStudentProfiles = await Promise.all(
      members.map(async (member: { id: string }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: studentProfileData } = await (adminClient as any)
          .from('student_profiles')
          .select(`
            id,
            enrollment_date,
            current_belt_id
          `)
          .eq('profile_id', member.id)
          .single()

        let currentBelt = null
        if (studentProfileData?.current_belt_id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: beltData } = await (adminClient as any)
            .from('belt_ranks')
            .select('id, name, color')
            .eq('id', studentProfileData.current_belt_id)
            .single()
          currentBelt = beltData
        }

        return {
          ...member,
          student_profile: studentProfileData ? {
            ...studentProfileData,
            current_belt: currentBelt,
          } : null,
        }
      })
    )

    return NextResponse.json({
      family: familyData,
      members: membersWithStudentProfiles,
      profile,
      isPrimaryHolder: familyData.primary_holder_id === user.id,
    })
  } catch (error) {
    console.error('My family error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
