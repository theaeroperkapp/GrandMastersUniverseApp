'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { PasswordStrength } from '@/components/ui/password-strength'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

function OwnerSignupForm() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [isApproved, setIsApproved] = useState(false)
  const [verificationError, setVerificationError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const verifyApproval = async () => {
      const emailParam = searchParams.get('email')
      const schoolNameParam = searchParams.get('school')

      if (!emailParam) {
        setIsVerifying(false)
        setVerificationError('No email provided. Please use the link from your approval email.')
        return
      }

      const decodedEmail = decodeURIComponent(emailParam)
      setEmail(decodedEmail)

      // Server-side verification of approval status
      try {
        const response = await fetch('/api/auth/verify-approval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: decodedEmail }),
        })

        const result = await response.json()

        if (result.approved) {
          setIsApproved(true)
          // Use school name from server (more reliable) or from URL
          const decodedSchoolName = result.schoolName || (schoolNameParam ? decodeURIComponent(schoolNameParam) : '')
          setSchoolName(decodedSchoolName)
          // Fix: Generate subdomain from decoded school name
          setSubdomain(decodedSchoolName.toLowerCase().replace(/[^a-z0-9]/g, ''))
        } else {
          setVerificationError(result.error || 'Your application has not been approved yet.')
        }
      } catch {
        setVerificationError('Failed to verify approval status. Please try again.')
      }

      setIsVerifying(false)
    }

    verifyApproval()
  }, [searchParams])

  const handleSchoolNameChange = (value: string) => {
    setSchoolName(value)
    // Auto-generate subdomain from decoded value
    const cleanSubdomain = value.toLowerCase().replace(/[^a-z0-9]/g, '')
    setSubdomain(cleanSubdomain)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    if (subdomain.length < 3) {
      toast.error('School subdomain must be at least 3 characters')
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      // Double-check approval status server-side before proceeding
      const verifyResponse = await fetch('/api/auth/verify-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const verifyResult = await verifyResponse.json()
      if (!verifyResult.approved) {
        toast.error('Your application is not approved. Please apply through the waitlist.')
        setIsLoading(false)
        return
      }

      // Check if subdomain is available
      const { data: existingSchool } = await supabase
        .from('schools')
        .select('id')
        .eq('subdomain', subdomain.toLowerCase())
        .single()

      if (existingSchool) {
        toast.error('This subdomain is already taken. Please choose another.')
        setIsLoading(false)
        return
      }

      // Create the user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'owner',
          },
        },
      })

      if (signUpError) {
        toast.error(signUpError.message)
        return
      }

      if (!authData.user) {
        toast.error('Failed to create account')
        return
      }

      // Create the school
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .insert({
          name: schoolName,
          subdomain: subdomain.toLowerCase(),
          owner_id: authData.user.id,
          subscription_status: 'trial',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          monthly_post_limit: 100,
          announcement_limit: 50,
        } as never)
        .select()
        .single()

      if (schoolError) {
        console.error('School creation error:', schoolError)
        toast.error('Failed to create school: ' + schoolError.message)
        return
      }

      // Update the user's profile with school_id, role as owner, and set as approved
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          school_id: (school as { id: string }).id,
          role: 'owner',
          is_approved: true,
        } as never)
        .eq('id', authData.user.id)

      if (profileError) {
        console.error('Profile update error:', profileError)
        // Show error but still redirect - account was created
        toast.error('Account created but profile setup incomplete. Please contact support if you have issues.')
      } else {
        toast.success('Account and school created! Please check your email to confirm your account.')
      }

      router.push('/login')
    } catch (err) {
      console.error('Signup error:', err)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state while verifying
  if (isVerifying) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-8 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-600 mb-4" />
          <p className="text-gray-600">Verifying your approval status...</p>
        </CardContent>
      </Card>
    )
  }

  // Not approved state
  if (!isApproved) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">School Owner Registration</CardTitle>
          <CardDescription>
            This page is for approved school owners only
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {verificationError && (
            <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              {verificationError}
            </p>
          )}
          <p className="text-gray-600">
            To register as a school owner, please first apply through our waitlist.
          </p>
          <Link href="/waitlist">
            <Button>Apply for Waitlist</Button>
          </Link>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-red-600 hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Set Up Your School</CardTitle>
        <CardDescription>
          Create your account and school on GrandMastersUniverse
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schoolName">School Name</Label>
            <Input
              id="schoolName"
              type="text"
              placeholder="Your martial arts school name"
              value={schoolName}
              onChange={(e) => handleSchoolNameChange(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subdomain">School URL</Label>
            <div className="flex items-center gap-2">
              <Input
                id="subdomain"
                type="text"
                placeholder="yourschool"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                required
              />
              <span className="text-sm text-gray-500 whitespace-nowrap">.grandmastersuniverse.com</span>
            </div>
            <p className="text-xs text-gray-500">
              This will be your school&apos;s unique URL
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Your Full Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500">
              This is the email your application was approved for
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <PasswordStrength password={password} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500">Passwords do not match</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" isLoading={isLoading}>
            Create School Account
          </Button>
          <p className="text-sm text-center text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-red-600 hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function OwnerSignupPage() {
  return (
    <Suspense fallback={
      <Card className="w-full max-w-md">
        <CardContent className="p-8 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-600 mb-4" />
          <p className="text-gray-600">Loading...</p>
        </CardContent>
      </Card>
    }>
      <OwnerSignupForm />
    </Suspense>
  )
}
