import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { pending_contract_id, signature_data, agreed_to_terms } = body

    if (!pending_contract_id || !signature_data || !agreed_to_terms) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the pending contract
    const { data: pendingContract } = await supabase
      .from('pending_contracts')
      .select('*, template:contract_templates(*), student:student_profiles(*, profile:profiles(*))')
      .eq('id', pending_contract_id)
      .eq('status', 'pending')
      .single()

    const pendingData = pendingContract as {
      id: string
      template_id: string
      student_id: string
      school_id: string
      template: { id: string; content: string }
      student: { id: string; profile: { id: string } }
    } | null

    if (!pendingData) {
      return NextResponse.json({ error: 'Pending contract not found or already signed' }, { status: 404 })
    }

    // Verify user has permission to sign (is the student, parent, or school owner)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: string; school_id: string | null } | null
    const isOwner = profileData?.role === 'owner' && profileData?.school_id === pendingData.school_id
    const isStudent = pendingData.student?.profile?.id === user.id

    // Check if user is a parent of the student
    const { data: parentLink } = await supabase
      .from('family_links')
      .select('id')
      .eq('parent_id', user.id)
      .eq('student_id', pendingData.student_id)
      .single()

    const isParent = !!parentLink

    if (!isOwner && !isStudent && !isParent) {
      return NextResponse.json({ error: 'You do not have permission to sign this contract' }, { status: 403 })
    }

    // Get IP address
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown'

    // Create signed contract
    const { data: signedContract, error: signError } = await (adminClient as any)
      .from('signed_contracts')
      .insert({
        template_id: pendingData.template_id,
        student_id: pendingData.student_id,
        school_id: pendingData.school_id,
        signer_id: user.id,
        signature_data,
        contract_content: pendingData.template.content,
        ip_address: ip,
        user_agent: request.headers.get('user-agent'),
      })
      .select()
      .single()

    if (signError) {
      console.error('Sign contract error:', signError)
      return NextResponse.json({ error: 'Failed to sign contract' }, { status: 500 })
    }

    // Update pending contract status
    await (adminClient as any)
      .from('pending_contracts')
      .update({ status: 'signed', signed_at: new Date().toISOString() })
      .eq('id', pending_contract_id)

    return NextResponse.json({
      success: true,
      signed_contract_id: signedContract.id,
    }, { status: 201 })
  } catch (error) {
    console.error('Sign contract API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get pending contracts for the current user to sign
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get student profiles linked to this user (as student or parent)
    const { data: studentProfile } = await supabase
      .from('student_profiles')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    const studentProfileData = studentProfile as { id: string } | null

    const { data: familyLinks } = await supabase
      .from('family_links')
      .select('student_id')
      .eq('parent_id', user.id)

    const familyLinksData = familyLinks as { student_id: string }[] | null

    const studentIds = [
      ...(studentProfileData ? [studentProfileData.id] : []),
      ...(familyLinksData || []).map((link) => link.student_id),
    ]

    if (studentIds.length === 0) {
      return NextResponse.json([])
    }

    // Get pending contracts for these students
    const { data: pendingContracts, error } = await supabase
      .from('pending_contracts')
      .select('*, template:contract_templates(title, contract_type, content), student:student_profiles(*, profile:profiles(full_name))')
      .in('student_id', studentIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get pending contracts error:', error)
      return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 })
    }

    return NextResponse.json(pendingContracts)
  } catch (error) {
    console.error('Pending contracts API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
