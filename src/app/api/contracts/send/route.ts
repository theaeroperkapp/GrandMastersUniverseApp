import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  console.log('=== Contract Send API Called ===')
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: string; school_id: string | null } | null

    if (!profileData || (profileData.role !== 'owner' && profileData.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { contract_id, student_ids } = body

    if (!contract_id || !student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get contract to verify it exists and belongs to the school
    const { data: contract } = await supabase
      .from('contracts')
      .select('id, school_id, title, name')
      .eq('id', contract_id)
      .single()

    const contractData = contract as { id: string; school_id: string; title: string; name: string } | null

    if (!contractData) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    if (contractData.school_id !== profileData.school_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check for existing signed contracts for these students
    const { data: existingSignedContracts } = await supabase
      .from('signed_contracts')
      .select('signed_by')
      .eq('contract_id', contract_id)
      .in('signed_by', student_ids)

    const alreadySignedIds = (existingSignedContracts || []).map((c: { signed_by: string }) => c.signed_by)
    const newStudentIds = student_ids.filter((id: string) => !alreadySignedIds.includes(id))

    if (newStudentIds.length === 0) {
      return NextResponse.json({ error: 'All selected members have already signed this contract' }, { status: 400 })
    }

    // Create notifications for students/parents to sign the contract
    // Actual table schema: user_id, type, title, message, link, is_read
    const notifications = newStudentIds.map((user_id: string) => ({
      user_id,
      type: 'contract',
      title: 'Contract to Sign',
      message: `You have a new contract to sign: ${contractData.title || contractData.name}`,
      link: `/contracts/${contract_id}/sign`,
      is_read: false,
    }))

    console.log('Creating notifications for:', newStudentIds)
    console.log('Notification data:', JSON.stringify(notifications, null, 2))

    const { data: notifData, error: notifError } = await (adminClient as any)
      .from('notifications')
      .insert(notifications)
      .select()

    if (notifError) {
      console.error('Send notifications error:', notifError)
      // Don't fail the request if notifications fail - just log it
    } else {
      console.log('Notifications created successfully:', notifData)
    }

    return NextResponse.json({
      success: true,
      sent: newStudentIds.length,
      already_signed: alreadySignedIds.length,
    }, { status: 201 })
  } catch (error) {
    console.error('Send contracts API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
