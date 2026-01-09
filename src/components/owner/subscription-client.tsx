'use client'

import { useState, useEffect } from 'react'
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
  Clock,
  ExternalLink,
  Loader2,
  Building2,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { CardManagement } from '@/components/payments/card-management'
import { AddCardModal } from '@/components/payments/add-card-modal'

interface School {
  id: string
  name: string
  stripe_customer_id: string | null
  stripe_account_id: string | null
  subscription_status: string
  subscription_plan: string | null
  trial_ends_at: string | null
  subscription_ends_at: string | null
  billing_day: number | null
  last_payment_at?: string | null
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

interface PaymentMethod {
  id: string
  brand: string
  last4: string
  exp_month: number
  exp_year: number
  is_default: boolean
}

interface ConnectStatus {
  connected: boolean
  status: 'not_created' | 'pending' | 'active'
  details_submitted?: boolean
  charges_enabled?: boolean
  payouts_enabled?: boolean
}

export function SubscriptionClient({ school, userEmail }: SubscriptionClientProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isPayingInApp, setIsPayingInApp] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const [showAddCard, setShowAddCard] = useState(false)
  const [loadingCards, setLoadingCards] = useState(true)
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null)
  const [loadingConnect, setLoadingConnect] = useState(true)
  const [isConnectLoading, setIsConnectLoading] = useState(false)
  const [showPayNowModal, setShowPayNowModal] = useState(false)
  const [payNowLoading, setPayNowLoading] = useState(false)
  const [payNowCard, setPayNowCard] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchPaymentMethods()
    fetchConnectStatus()
  }, [])

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/payment-methods')
      const data = await response.json()
      if (data.payment_methods) {
        setPaymentMethods(data.payment_methods)
        const defaultCard = data.payment_methods.find((pm: PaymentMethod) => pm.is_default)
        if (defaultCard) {
          setSelectedPaymentMethod(defaultCard.id)
        } else if (data.payment_methods.length > 0) {
          setSelectedPaymentMethod(data.payment_methods[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error)
    } finally {
      setLoadingCards(false)
    }
  }

  const fetchConnectStatus = async () => {
    try {
      const response = await fetch('/api/connect/status')
      const data = await response.json()
      setConnectStatus(data)
    } catch (error) {
      console.error('Error fetching connect status:', error)
    } finally {
      setLoadingConnect(false)
    }
  }

  const handleConnectOnboard = async () => {
    setIsConnectLoading(true)
    try {
      const response = await fetch('/api/connect/onboard', {
        method: 'POST',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start onboarding')
      }

      // Redirect to Stripe Connect onboarding
      window.location.href = data.url
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setIsConnectLoading(false)
    }
  }

  const handleConnectDashboard = async () => {
    setIsConnectLoading(true)
    try {
      const response = await fetch('/api/connect/dashboard', {
        method: 'POST',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open dashboard')
      }

      // Open Stripe Connect dashboard
      window.open(data.url, '_blank')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setIsConnectLoading(false)
    }
  }

  const isTrialing = school.subscription_status === 'trialing' || school.subscription_status === 'trial'
  const isActive = school.subscription_status === 'active'
  const isPastDue = school.subscription_status === 'past_due'
  const isCanceled = school.subscription_status === 'canceled'
  const isInactive = !school.subscription_status || school.subscription_status === 'inactive'

  const trialEndsAt = school.trial_ends_at ? new Date(school.trial_ends_at) : null
  const daysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  // Calculate next billing date based on billing_day
  const getNextBillingDate = () => {
    if (!school.billing_day) return null
    const now = new Date()
    const billingDay = school.billing_day
    let nextBilling = new Date(now.getFullYear(), now.getMonth(), billingDay)

    // If we've passed the billing day this month, next billing is next month
    if (now.getDate() > billingDay) {
      nextBilling = new Date(now.getFullYear(), now.getMonth() + 1, billingDay)
    }
    return nextBilling
  }

  // Check if billing is past due (billing day has passed this month)
  const getBillingStatus = () => {
    // Founding partners don't have monthly fees
    if (school.subscription_plan === 'founding_partner') {
      return { isPastDue: false, daysPastDue: 0, billingDay: null, needsPayment: false, paidThisMonth: false }
    }

    // If no billing day set, no warning
    if (!school.billing_day) {
      return { isPastDue: false, daysPastDue: 0, billingDay: null, needsPayment: false, paidThisMonth: false }
    }

    const now = new Date()
    const billingDay = school.billing_day
    const isPastBillingDay = now.getDate() > billingDay
    const daysPastDue = isPastBillingDay ? now.getDate() - billingDay : 0

    // Check if payment was made this month
    let paidThisMonth = false
    if (school.last_payment_at) {
      const lastPaymentDate = new Date(school.last_payment_at)
      paidThisMonth = lastPaymentDate.getMonth() === now.getMonth() &&
                      lastPaymentDate.getFullYear() === now.getFullYear()
    }

    // Show warning if:
    // 1. Status is explicitly past_due (from Stripe/webhook) - this is a hard failure
    // 2. Billing day has passed this month AND no payment this month
    if (isPastDue) {
      // Hard past due - payment failed
      return { isPastDue: true, daysPastDue, billingDay, needsPayment: true, paidThisMonth }
    }

    if (isPastBillingDay && !paidThisMonth) {
      // Soft reminder - billing day passed, no payment yet
      return { isPastDue: false, daysPastDue, billingDay, needsPayment: true, paidThisMonth }
    }

    return { isPastDue: false, daysPastDue: 0, billingDay, needsPayment: false, paidThisMonth }
  }

  const billingStatus = getBillingStatus()
  const nextBillingDate = getNextBillingDate()

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

  const handlePayInApp = async () => {
    if (!selectedPaymentMethod) {
      toast.error('Please select a payment method')
      return
    }

    setIsPayingInApp(true)
    try {
      const response = await fetch('/api/pay/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method_id: selectedPaymentMethod,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start subscription')
      }

      toast.success('Subscription started successfully!')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setIsPayingInApp(false)
    }
  }

  const handleCardAdded = () => {
    setShowAddCard(false)
    fetchPaymentMethods()
  }

  const handlePayNow = async () => {
    if (!payNowCard) {
      toast.error('Please select a payment method')
      return
    }

    setPayNowLoading(true)
    try {
      const response = await fetch('/api/pay/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method_id: payNowCard,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process payment')
      }

      if (data.requires_action) {
        // Handle 3D Secure authentication if needed
        toast.error('Additional authentication required. Please try a different card.')
        return
      }

      toast.success('Payment successful! Thank you.')
      setShowPayNowModal(false)
      setPayNowCard(null)
      // Force full page reload to reflect payment status
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Payment failed')
    } finally {
      setPayNowLoading(false)
    }
  }

  const handlePayNowCardAdded = () => {
    setShowAddCard(false)
    fetchPaymentMethods()
    // Auto-select the new card if it's the first one
    setTimeout(() => {
      if (paymentMethods.length === 0) {
        fetchPaymentMethods()
      }
    }, 500)
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

      {/* Payment Failed Warning (Hard - from Stripe) */}
      {isPastDue && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">Payment Failed</p>
                <p className="text-sm text-red-700">
                  Your last payment attempt failed. Please update your payment method to continue using all features.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Due Warning (Soft - billing day passed) */}
      {!isPastDue && billingStatus.needsPayment && billingStatus.billingDay && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Payment Due</p>
                  <p className="text-sm text-amber-700">
                    Your monthly payment of $99 was due on the {billingStatus.billingDay}
                    {billingStatus.billingDay === 1 ? 'st' : billingStatus.billingDay === 2 ? 'nd' : billingStatus.billingDay === 3 ? 'rd' : 'th'}
                    {billingStatus.daysPastDue > 0 && ` (${billingStatus.daysPastDue} day${billingStatus.daysPastDue !== 1 ? 's' : ''} ago)`}.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 whitespace-nowrap"
                onClick={() => setShowPayNowModal(true)}
              >
                Pay Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stripe Connect - Accept Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Accept Payments
            </span>
            {!loadingConnect && connectStatus && (
              connectStatus.connected ? (
                <Badge className="bg-green-500">Active</Badge>
              ) : connectStatus.status === 'pending' ? (
                <Badge className="bg-amber-500">Setup Incomplete</Badge>
              ) : (
                <Badge variant="outline">Not Set Up</Badge>
              )
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingConnect ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : connectStatus?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span>Your payment account is active and ready to accept payments</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Card payments enabled</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Payouts enabled</span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleConnectDashboard}
                disabled={isConnectLoading}
              >
                {isConnectLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                View Stripe Dashboard
              </Button>
            </div>
          ) : connectStatus?.status === 'pending' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                <span>Please complete your payment account setup</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  {connectStatus.details_submitted ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span>Details submitted</span>
                </div>
                <div className="flex items-center gap-2">
                  {connectStatus.charges_enabled ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span>Charges enabled</span>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={handleConnectOnboard}
                disabled={isConnectLoading}
              >
                {isConnectLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Complete Setup
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600">
                Set up your payment account to accept tuition payments, event fees, and custom charges from your students and families.
              </p>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Accept credit/debit card payments</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Automatic payouts to your bank account</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Secure payment processing by Stripe</span>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={handleConnectOnboard}
                disabled={isConnectLoading}
              >
                {isConnectLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Building2 className="h-4 w-4 mr-2" />
                )}
                Set Up Payment Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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

            {isActive && school.subscription_ends_at && (
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Next billing date: {formatDate(school.subscription_ends_at)}</span>
              </div>
            )}

            {school.subscription_plan === 'standard' && school.billing_day && !isTrialing && (
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  Monthly payment due on the {school.billing_day}
                  {school.billing_day === 1 ? 'st' : school.billing_day === 2 ? 'nd' : school.billing_day === 3 ? 'rd' : 'th'} of each month
                  {nextBillingDate && ` (next: ${formatDate(nextBillingDate.toISOString())})`}
                </span>
              </div>
            )}

            {school.subscription_plan === 'founding_partner' && (
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-4 w-4" />
                <span>Founding Partner - No monthly fees</span>
              </div>
            )}

            <div className="pt-4 space-y-3">
              {(isInactive || isCanceled || isTrialing) && (
                <>
                  {/* In-App Payment Option */}
                  {!loadingCards && paymentMethods.length > 0 && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Pay with saved card
                        </label>
                        <div className="space-y-2">
                          {paymentMethods.map((pm) => (
                            <label
                              key={pm.id}
                              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedPaymentMethod === pm.id
                                  ? 'border-red-500 bg-red-50'
                                  : 'border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name="paymentMethod"
                                value={pm.id}
                                checked={selectedPaymentMethod === pm.id}
                                onChange={() => setSelectedPaymentMethod(pm.id)}
                                className="text-red-600"
                              />
                              <CreditCard className="h-5 w-5 text-gray-400" />
                              <span className="capitalize">{pm.brand}</span>
                              <span className="text-gray-500">•••• {pm.last4}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={handlePayInApp}
                        disabled={isPayingInApp || !selectedPaymentMethod}
                      >
                        {isPayingInApp ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            Start Subscription
                          </>
                        )}
                      </Button>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="bg-white px-2 text-gray-500">or</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Add New Card / Stripe Checkout */}
                  <Button
                    variant={paymentMethods.length > 0 ? 'outline' : 'default'}
                    className="w-full"
                    size="lg"
                    onClick={handleSubscribe}
                    isLoading={isLoading}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {paymentMethods.length > 0 ? 'Pay with New Card' : 'Subscribe Now'}
                  </Button>
                </>
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

      {/* Payment Methods */}
      <CardManagement onCardAdded={fetchPaymentMethods} />

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

      {/* Pay Now Modal */}
      {showPayNowModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Pay Monthly Subscription</h3>
                <p className="text-gray-500 text-sm">$99.00 due</p>
              </div>
            </div>

            {loadingCards ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : paymentMethods.length > 0 ? (
              <div className="space-y-4 mb-6">
                <label className="text-sm font-medium text-gray-700">
                  Select payment method
                </label>
                <div className="space-y-2">
                  {paymentMethods.map((pm) => (
                    <label
                      key={pm.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        payNowCard === pm.id
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payNowCard"
                        value={pm.id}
                        checked={payNowCard === pm.id}
                        onChange={() => setPayNowCard(pm.id)}
                        className="text-amber-600"
                      />
                      <CreditCard className="h-5 w-5 text-gray-400" />
                      <span className="capitalize">{pm.brand}</span>
                      <span className="text-gray-500">•••• {pm.last4}</span>
                      <span className="text-gray-400 text-sm ml-auto">
                        {pm.exp_month}/{pm.exp_year}
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddCard(true)}
                  className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                >
                  + Add a new card
                </button>
              </div>
            ) : (
              <div className="mb-6">
                <p className="text-gray-600 text-sm mb-4">
                  No payment methods on file. Add a card to make your payment.
                </p>
                <Button
                  onClick={() => setShowAddCard(true)}
                  variant="outline"
                  className="w-full"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Add Payment Method
                </Button>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPayNowModal(false)
                  setPayNowCard(null)
                }}
                disabled={payNowLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayNow}
                disabled={payNowLoading || !payNowCard}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                {payNowLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Pay $99.00'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {showAddCard && (
        <AddCardModal
          isOpen={showAddCard}
          onClose={() => setShowAddCard(false)}
          onSuccess={showPayNowModal ? handlePayNowCardAdded : handleCardAdded}
        />
      )}
    </div>
  )
}
