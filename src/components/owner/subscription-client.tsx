'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  Check,
  AlertTriangle,
  Calendar,
  Zap,
  Shield,
  Users,
  Clock,
  ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface School {
  id: string
  name: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: string
  subscription_plan: string | null
  trial_ends_at: string | null
  current_period_end: string | null
}

interface SubscriptionClientProps {
  school: School
  userEmail: string
}

const PLAN_FEATURES = [
  'Unlimited students',
  'Class scheduling & attendance',
  'Belt rank management',
  'Event management with fees',
  'Contracts & digital signatures',
  'Parent/family portal',
  'Social feed for community',
  'Custom subdomain',
  'Email support',
]

export function SubscriptionClient({ school, userEmail }: SubscriptionClientProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const isTrialing = school.subscription_status === 'trialing'
  const isActive = school.subscription_status === 'active'
  const isPastDue = school.subscription_status === 'past_due'
  const isCanceled = school.subscription_status === 'canceled'
  const isInactive = !school.subscription_status || school.subscription_status === 'inactive'

  const trialEndsAt = school.trial_ends_at ? new Date(school.trial_ends_at) : null
  const daysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  const handleSubscribe = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: school.id,
          email: userEmail,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleManageBilling = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: school.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session')
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = () => {
    if (isActive) {
      return <Badge className="bg-green-500">Active</Badge>
    }
    if (isTrialing) {
      return <Badge className="bg-blue-500">Trial</Badge>
    }
    if (isPastDue) {
      return <Badge className="bg-red-500">Past Due</Badge>
    }
    if (isCanceled) {
      return <Badge variant="secondary">Canceled</Badge>
    }
    return <Badge variant="outline">Inactive</Badge>
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Trial Warning Banner */}
      {isTrialing && daysRemaining <= 7 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">
                  Your trial ends in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-amber-700">
                  Subscribe now to continue using all features without interruption.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Due Warning */}
      {isPastDue && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">Payment Failed</p>
                <p className="text-sm text-red-700">
                  Please update your payment method to avoid service interruption.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Plan
            </span>
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">$99</span>
              <span className="text-gray-500">/month</span>
            </div>

            {isTrialing && trialEndsAt && (
              <div className="flex items-center gap-2 text-blue-600">
                <Clock className="h-4 w-4" />
                <span>Trial ends {formatDate(school.trial_ends_at)}</span>
              </div>
            )}

            {isActive && school.current_period_end && (
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Next billing date: {formatDate(school.current_period_end)}</span>
              </div>
            )}

            <div className="pt-4 space-y-3">
              {(isInactive || isCanceled) && (
                <Button className="w-full" size="lg" onClick={handleSubscribe} isLoading={isLoading}>
                  <Zap className="h-4 w-4 mr-2" />
                  Subscribe Now
                </Button>
              )}

              {isTrialing && (
                <Button className="w-full" size="lg" onClick={handleSubscribe} isLoading={isLoading}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Add Payment Method
                </Button>
              )}

              {(isActive || isPastDue) && school.stripe_customer_id && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleManageBilling}
                  isLoading={isLoading}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Manage Billing
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            What&apos;s Included
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {PLAN_FEATURES.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-3 w-3 text-green-600" />
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">Can I cancel anytime?</h4>
              <p className="text-sm text-gray-500">
                Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.
              </p>
            </div>
            <div>
              <h4 className="font-medium">What happens after the trial?</h4>
              <p className="text-sm text-gray-500">
                If you don&apos;t subscribe before your trial ends, your account will be limited. Add a payment method to continue using all features.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Is my payment information secure?</h4>
              <p className="text-sm text-gray-500">
                Yes, we use Stripe for payment processing. Your card details are never stored on our servers.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Do you offer refunds?</h4>
              <p className="text-sm text-gray-500">
                We offer a full refund within the first 14 days of your paid subscription if you&apos;re not satisfied.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
