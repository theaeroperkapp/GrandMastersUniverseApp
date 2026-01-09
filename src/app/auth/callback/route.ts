import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/feed'

  // Handle OAuth or magic link code exchange
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('Auth callback error (code):', error)
    return NextResponse.redirect(`${origin}/login?error=auth_error`)
  }

  // Handle email confirmation/invite token
  if (token_hash && type) {
    const supabase = await createClient()

    if (type === 'email' || type === 'signup' || type === 'invite' || type === 'magiclink') {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as 'email' | 'signup' | 'invite' | 'magiclink',
      })

      if (!error) {
        // For invite type, redirect to set password page
        if (type === 'invite') {
          return NextResponse.redirect(`${origin}/set-password`)
        }
        return NextResponse.redirect(`${origin}${next}`)
      }

      console.error('Auth callback error (token):', error)
      return NextResponse.redirect(`${origin}/login?error=verification_failed`)
    }

    // Handle password recovery
    if (type === 'recovery') {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'recovery',
      })

      if (!error) {
        return NextResponse.redirect(`${origin}/reset-password/update`)
      }

      console.error('Auth callback error (recovery):', error)
      return NextResponse.redirect(`${origin}/login?error=recovery_failed`)
    }
  }

  // No valid params, redirect to login
  return NextResponse.redirect(`${origin}/login?error=invalid_callback`)
}
