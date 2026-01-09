'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import toast from 'react-hot-toast'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/feed'
  const message = searchParams.get('message')
  const error = searchParams.get('error')

  // Show messages based on URL params
  const getMessage = () => {
    if (message === 'email_confirmed') {
      return {
        type: 'success',
        text: 'Email confirmed! Please wait for your school to approve your account, then sign in.',
      }
    }
    if (message === 'pending_approval') {
      return {
        type: 'info',
        text: 'Your account is pending approval. Please wait for your school to approve you.',
      }
    }
    if (error === 'verification_failed') {
      return {
        type: 'error',
        text: 'Email verification failed. Please try again or request a new confirmation email.',
      }
    }
    if (error === 'auth_error') {
      return {
        type: 'error',
        text: 'Authentication error. Please try signing in again.',
      }
    }
    return null
  }

  const messageInfo = getMessage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Welcome back!')
      router.push(redirect)
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome Back</CardTitle>
        <CardDescription>
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {messageInfo && (
            <div
              className={`p-3 rounded-lg text-sm ${
                messageInfo.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : messageInfo.type === 'info'
                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {messageInfo.text}
            </div>
          )}
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/reset-password"
                className="text-sm text-red-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" isLoading={isLoading}>
            Sign In
          </Button>
          <p className="text-sm text-center text-gray-500">
            Don't have an account?{' '}
            <Link href="/signup" className="text-red-600 hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Card className="w-full max-w-md">
        <CardContent className="py-12 text-center">
          <p>Loading...</p>
        </CardContent>
      </Card>
    }>
      <LoginForm />
    </Suspense>
  )
}
