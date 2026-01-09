'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import toast from 'react-hot-toast'

function SignupForm() {
  const searchParams = useSearchParams()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [schoolCode, setSchoolCode] = useState('')
  const [schoolName, setSchoolName] = useState<string | null>(null)
  const [accountType, setAccountType] = useState<'parent' | 'student'>('parent')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Check for school code in URL parameters
  useEffect(() => {
    const codeFromUrl = searchParams.get('code')
    if (codeFromUrl) {
      setSchoolCode(codeFromUrl)
      // Verify and show school name
      verifySchoolCode(codeFromUrl)
    }
  }, [searchParams])

  const verifySchoolCode = async (code: string) => {
    const supabase = createClient()
    const { data: school } = await supabase
      .from('schools')
      .select('name')
      .eq('subdomain', code.toLowerCase())
      .single()

    if (school) {
      setSchoolName((school as { name: string }).name)
    }
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

    setIsLoading(true)

    try {
      const supabase = createClient()

      // First verify school code exists
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('id, name')
        .eq('subdomain', schoolCode.toLowerCase())
        .single()

      if (schoolError || !school) {
        toast.error('Invalid school code. Please check with your school.')
        setIsLoading(false)
        return
      }

      const schoolData = school as { id: string; name: string }

      // Create the user account
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            school_id: schoolData.id,
            role: accountType,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) {
        toast.error(signUpError.message)
        return
      }

      toast.success('Account created! Please wait for approval from your school.')
      router.push('/login')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create Account</CardTitle>
        <CardDescription>
          Join your martial arts school community
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schoolCode">School Code</Label>
            <Input
              id="schoolCode"
              type="text"
              placeholder="Enter your school's code"
              value={schoolCode}
              onChange={(e) => {
                setSchoolCode(e.target.value)
                setSchoolName(null)
                if (e.target.value.length >= 3) {
                  verifySchoolCode(e.target.value)
                }
              }}
              required
            />
            {schoolName ? (
              <p className="text-xs text-green-600 font-medium">
                ✓ Joining: {schoolName}
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                Ask your school for their unique code
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Account Type</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="accountType"
                  value="parent"
                  checked={accountType === 'parent'}
                  onChange={() => setAccountType('parent')}
                  className="w-4 h-4 text-red-600"
                />
                <span className="text-sm">Parent/Guardian</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="accountType"
                  value="student"
                  checked={accountType === 'student'}
                  onChange={() => setAccountType('student')}
                  className="w-4 h-4 text-red-600"
                />
                <span className="text-sm">Student (16+)</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
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
            />
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
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" isLoading={isLoading}>
            Create Account
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

export default function SignupPage() {
  return (
    <Suspense fallback={
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    }>
      <SignupForm />
    </Suspense>
  )
}
