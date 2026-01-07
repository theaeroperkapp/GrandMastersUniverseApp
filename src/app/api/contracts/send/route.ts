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
    const { template_id, student_ids } = body

    if (!template_id || !student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get template to verify it exists and get school_id
    const { data: template } = await supabase
      .from('contract_templates')
      .select('id, school_id, title')
      .eq('id', template_id)
      .single()

    const templateData = template as { id: string; school_id: string; title: string } | null

    if (!templateData) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Check for existing pending contracts for these students
    const { data: existingContracts } = await supabase
      .from('pending_contracts')
      .select('student_id')
      .eq('template_id', template_id)
      .in('student_id', student_ids)
      .eq('status', 'pending')

    const existingStudentIds = (existingContracts || []).map((c: { student_id: string }) => c.student_id)
    const newStudentIds = student_ids.filter((id: string) => !existingStudentIds.includes(id))

    if (newStudentIds.length === 0) {
      return NextResponse.json({ error: 'All selected students already have pending contracts' }, { status: 400 })
    }

    // Create pending contracts
    const pendingContracts = newStudentIds.map((student_id: string) => ({
      template_id,
      student_id,
      school_id: templateData.school_id,
      sent_by: user.id,
      status: 'pending',
    }))

    const { error } = await (adminClient as any)
      .from('pending_contracts')
      .insert(pendingContracts)

    if (error) {
      console.error('Send contracts error:', error)
      return NextResponse.json({ error: 'Failed to send contracts' }, { status: 500 })
    }

    // TODO: Send email notifications to students/parents

    return NextResponse.json({
      success: true,
      sent: newStudentIds.length,
      already_pending: existingStudentIds.length,
    }, { status: 201 })
  } catch (error) {
    console.error('Send contracts API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
