'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function AuthHandler() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handleAuthRedirect = async () => {
      // Check if there's a hash fragment with auth tokens
      if (typeof window === 'undefined') return

      const hash = window.location.hash
      if (!hash || !hash.includes('access_token')) return

      // Parse the hash fragment
      const params = new URLSearchParams(hash.substring(1))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const type = params.get('type')

      if (!accessToken) return

      const supabase = createClient()

      // Set the session from the tokens
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (error) {
          console.error('Auth handler error:', error)
          // Clear the hash and redirect to login with error
          window.location.href = '/login?error=auth_failed'
          return
        }

        // Clear the hash from URL
        window.history.replaceState(null, '', pathname)

        // Handle different auth types
        if (type === 'invite') {
          // Invite flow - redirect to set password
          router.push('/set-password')
        } else if (type === 'signup' || type === 'email') {
          // Email confirmation - check if user needs approval
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('is_approved')
              .eq('id', user.id)
              .single()

            const profileData = profile as { is_approved: boolean } | null
            if (!profileData?.is_approved) {
              // Sign out unapproved users
              await supabase.auth.signOut()
              router.push('/login?message=email_confirmed')
              return
            }
          }
          router.push('/feed')
        } else if (type === 'recovery') {
          // Password recovery
          router.push('/reset-password/update')
        } else {
          // Default - go to feed
          router.push('/feed')
        }
      }
    }

    handleAuthRedirect()
  }, [router, pathname])

  return null
}
