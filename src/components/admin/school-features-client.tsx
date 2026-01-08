'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  DollarSign,
  Award,
  FileText,
  Users,
  CreditCard,
  BarChart,
  Mail,
  MessageSquare,
  Bell,
  CalendarDays,
  UserCheck,
  Crown,
  Zap,
  Clock,
} from 'lucide-react'
import { format, isValid } from 'date-fns'
import toast from 'react-hot-toast'

// Safe date formatter
function safeFormatDate(dateStr: string | null | undefined, formatStr: string): string {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    if (!isValid(date)) return '-'
    return format(date, formatStr)
  } catch {
    return '-'
  }
}

interface PlatformFeature {
  id: string
  feature_code: string
  name: string
  description: string
  category: string
}

interface FeatureSubscription {
  id: string
  feature_code: string
  is_enabled: boolean
}

interface Payment {
  id: string
  amount: number
  payment_type: string
  status: string
  paid_at: string
  description: string
  notes: string | null
  period_start: string | null
  period_end: string | null
}

interface School {
  id: string
  name: string
  subdomain: string
  subscription_status: string
  subscription_plan: string | null
  trial_ends_at: string | null
  student_count?: number
}

interface SchoolFeaturesClientProps {
  school: School
  availableFeatures: PlatformFeature[]
  currentSubscriptions: FeatureSubscription[]
  paymentHistory: Payment[]
}

// Subscription tiers
const SUBSCRIPTION_TIERS = {
  founding_partner: {
    name: 'Founding Partner',
    price: 0,
    description: 'Lifetime free access (referral partner)',
    badge: 'success' as const,
    icon: Crown,
  },
  standard: {
    name: 'Standard',
    price: 99,
    description: '$99/month - All features included',
    badge: 'default' as const,
    icon: Zap,
  },
  trial: {
    name: 'Trial',
    price: 0,
    description: '30-day free trial → converts to $99/mo',
    badge: 'secondary' as const,
    icon: Clock,
  },
}

export function SchoolFeaturesClient({
  school,
  availableFeatures,
  currentSubscriptions,
  paymentHistory,
}: SchoolFeaturesClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showTierModal, setShowTierModal] = useState(false)
  const [selectedTier, setSelectedTier] = useState<string>(school.subscription_plan || 'trial')
  const [trialEndDate, setTrialEndDate] = useState<string>(
    school.trial_ends_at ? new Date(school.trial_ends_at).toISOString().slice(0, 10) : ''
  )
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentNote, setPaymentNote] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('99')

  const subscriptionMap = new Map(
    currentSubscriptions.map((sub) => [sub.feature_code, sub])
  )

  const currentTier = school.subscription_plan || 'trial'
  const tierInfo = SUBSCRIPTION_TIERS[currentTier as keyof typeof SUBSCRIPTION_TIERS] || SUBSCRIPTION_TIERS.trial

  const getFeatureIcon = (featureCode: string) => {
    switch (featureCode) {
      case 'social_feed':
        return <MessageSquare className="w-5 h-5" />
      case 'announcements':
        return <Bell className="w-5 h-5" />
      case 'class_schedule':
        return <CalendarDays className="w-5 h-5" />
      case 'attendance':
        return <UserCheck className="w-5 h-5" />
      case 'belt_testing':
        return <Award className="w-5 h-5" />
      case 'contracts':
        return <FileText className="w-5 h-5" />
      case 'families':
        return <Users className="w-5 h-5" />
      case 'events':
        return <Calendar className="w-5 h-5" />
      case 'payments':
        return <CreditCard className="w-5 h-5" />
      case 'email_templates':
        return <Mail className="w-5 h-5" />
      case 'reports':
        return <BarChart className="w-5 h-5" />
      default:
        return <CheckCircle2 className="w-5 h-5" />
    }
  }

  const handleToggleFeature = async (featureCode: string, enable: boolean) => {
    setLoading(featureCode)
    setError(null)

    try {
      const response = await fetch('/api/admin/features/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          featureCode,
          enable,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to toggle feature')
      }

      toast.success(enable ? 'Feature enabled' : 'Feature disabled')
      router.refresh()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(null)
    }
  }

  const handleUpdateSubscription = async () => {
    setLoading('subscription')
    setError(null)

    try {
      const response = await fetch('/api/admin/features/update-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          subscriptionPlan: selectedTier,
          trialEndDate: selectedTier === 'trial' && trialEndDate ? trialEndDate : null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update subscription')
      }

      toast.success('Subscription updated')
      setShowTierModal(false)
      router.refresh()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(null)
    }
  }

  const handleRecordPayment = async () => {
    setLoading('payment')
    setError(null)

    try {
      const response = await fetch('/api/admin/features/record-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          amount: parseFloat(paymentAmount),
          note: paymentNote.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to record payment')
      }

      toast.success('Payment recorded')
      setShowPaymentModal(false)
      setPaymentNote('')
      setPaymentAmount('99')
      router.refresh()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(null)
    }
  }

  const isTrialExpired = school.subscription_plan === 'trial' &&
    school.trial_ends_at &&
    new Date(school.trial_ends_at) < new Date()

  const getSubscriptionStatusBadge = () => {
    if (school.subscription_plan === 'founding_partner') {
      return <Badge variant="success">Founding Partner</Badge>
    }
    if (school.subscription_status === 'active') {
      return <Badge variant="success">Active</Badge>
    }
    if (school.subscription_status === 'trial') {
      if (isTrialExpired) {
        return <Badge variant="destructive">Trial Expired</Badge>
      }
      return <Badge variant="secondary">Trial</Badge>
    }
    if (school.subscription_status === 'past_due') {
      return <Badge variant="warning">Past Due</Badge>
    }
    if (school.subscription_status === 'canceled') {
      return <Badge variant="destructive">Canceled</Badge>
    }
    return <Badge variant="secondary">{school.subscription_status}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Subscription Overview */}
      <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold">Subscription</h3>
                {getSubscriptionStatusBadge()}
              </div>

              <div className="flex items-center gap-2 mb-1">
                {tierInfo.icon && <tierInfo.icon className="w-5 h-5 text-red-600" />}
                <span className="text-2xl font-bold text-red-600">{tierInfo.name}</span>
              </div>

              <p className="text-gray-600 mb-3">{tierInfo.description}</p>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">
                    ${tierInfo.price}/month
                  </span>
                </div>

                {school.subscription_plan === 'trial' && school.trial_ends_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className={isTrialExpired ? 'text-red-600 font-medium' : ''}>
                      {isTrialExpired ? 'Expired ' : 'Ends '}
                      {safeFormatDate(school.trial_ends_at, 'MMM d, yyyy')}
                    </span>
                  </div>
                )}

                {school.student_count !== undefined && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span>{school.student_count} students</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={() => setShowTierModal(true)} variant="outline">
                Change Tier
              </Button>
              <Button onClick={() => setShowPaymentModal(true)} variant="outline" size="sm">
                Record Payment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-600 font-medium">Error</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trial Expired Warning */}
      {isTrialExpired && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 font-medium">Trial Expired</p>
                <p className="text-amber-700 text-sm">
                  This school&apos;s trial has expired. Update their subscription tier or record a payment to restore access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Features */}
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <p className="text-sm text-gray-500">All features are included with any active subscription</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableFeatures.map((feature) => {
              const subscription = subscriptionMap.get(feature.feature_code)
              const isEnabled = subscription?.is_enabled ?? false
              const isLoading = loading === feature.feature_code

              return (
                <div
                  key={feature.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    isEnabled
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {getFeatureIcon(feature.feature_code)}
                      </div>
                      <div>
                        <h4 className="font-medium">{feature.name}</h4>
                        <p className="text-xs text-gray-500">{feature.description}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleFeature(feature.feature_code, !isEnabled)}
                      disabled={isLoading}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isEnabled ? 'bg-green-500' : 'bg-gray-300'
                      } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin mx-auto" />
                      ) : (
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      {paymentHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Description</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Period</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm">
                        {safeFormatDate(payment.paid_at, 'MMM d, yyyy')}
                      </td>
                      <td className="py-3 px-4 text-sm">{payment.description || 'Subscription Payment'}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {payment.period_start && payment.period_end
                          ? `${safeFormatDate(payment.period_start, 'MMM d')} - ${safeFormatDate(payment.period_end, 'MMM d, yyyy')}`
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium">
                        ${parseFloat(payment.amount.toString()).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            payment.status === 'succeeded'
                              ? 'success'
                              : payment.status === 'pending'
                              ? 'warning'
                              : 'destructive'
                          }
                        >
                          {payment.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Tier Modal */}
      {showTierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl">
            <h3 className="text-xl font-semibold mb-4">Change Subscription Tier</h3>

            <div className="space-y-3 mb-6">
              {Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => (
                <button
                  key={key}
                  onClick={() => setSelectedTier(key)}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                    selectedTier === key
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <tier.icon className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium">{tier.name}</p>
                      <p className="text-sm text-gray-600">{tier.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {selectedTier === 'trial' && (
              <div className="mb-6">
                <Label>Trial End Date</Label>
                <Input
                  type="date"
                  value={trialEndDate}
                  onChange={(e) => setTrialEndDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default: 30 days from today
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowTierModal(false)}
                disabled={loading === 'subscription'}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateSubscription}
                disabled={loading === 'subscription'}
                className="flex-1"
              >
                {loading === 'subscription' ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold">Record Manual Payment</h3>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>

              <div>
                <Label>Note (optional)</Label>
                <Input
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g., Check #1234, Wire transfer"
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="text-gray-600">School: <span className="font-medium text-gray-900">{school.name}</span></p>
                <p className="text-gray-600">Amount: <span className="font-medium text-gray-900">${parseFloat(paymentAmount || '0').toFixed(2)}</span></p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPaymentModal(false)
                  setPaymentNote('')
                  setPaymentAmount('99')
                }}
                disabled={loading === 'payment'}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRecordPayment}
                disabled={loading === 'payment' || !paymentAmount}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {loading === 'payment' ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Recording...
                  </span>
                ) : (
                  'Record Payment'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
