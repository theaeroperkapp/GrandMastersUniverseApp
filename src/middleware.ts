import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/about',
  '/contact',
  '/features',
  '/owners',
  '/pricing',
  '/privacy',
  '/terms',
  '/waitlist',
  '/login',
  '/signup',
  '/reset-password',
  '/update-password',
]

// Auth routes - redirect to dashboard if already logged in
const authRoutes = ['/login', '/signup', '/reset-password']

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // Check if it's a public route
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )
  const isAuthRoute = authRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )
  const isApiRoute = pathname.startsWith('/api')

  // Allow API routes to pass through
  if (isApiRoute) {
    return supabaseResponse
  }

  // If user is logged in and trying to access auth routes, redirect to feed
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/feed', request.url))
  }

  // If route is not public and user is not logged in, redirect to login
  if (!isPublicRoute && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
