'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  Receipt,
  Ticket,
  RefreshCw,
  Award,
} from 'lucide-react'
import { CardManagement } from '@/components/payments/card-management'
import { PaymentModal } from '@/components/payments/payment-modal'

interface EventPayment {
  id: string
  event_title: string
  amount: number
  payment_status: 'pending' | 'paid' | 'refunded'
  registered_at: string
}

interface CustomCharge {
  id: string
  description: string
  amount: number
  status: 'pending' | 'paid' | 'cancelled'
  due_date: string | null
  created_at: string
}

interface BeltTestPayment {
  id: string
  description: string
  amount: number
  status: 'pending' | 'paid' | 'cancelled'
  created_at: string
}

interface MembershipInfo {
  id: string
  membership_name: string
  status: 'active' | 'paused' | 'cancelled'
  current_period_start: string | null
  current_period_end: string | null
}

interface PaymentModalState {
  isOpen: boolean
  amount: number
  description: string
  paymentType: 'custom_charge' | 'event' | 'belt_test' | 'subscription'
  paymentId: string
}

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true)
  const [eventPayments, setEventPayments] = useState<EventPayment[]>([])
  const [customCharges, setCustomCharges] = useState<CustomCharge[]>([])
  const [beltTestPayments, setBeltTestPayments] = useState<BeltTestPayment[]>([])
  const [membership, setMembership] = useState<MembershipInfo | null>(null)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [paymentModal, setPaymentModal] = useState<PaymentModalState>({
    isOpen: false,
    amount: 0,
    description: '',
    paymentType: 'custom_charge',
    paymentId: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()
    const { data: authData } = await supabase.auth.getUser()

    if (!authData.user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('family_id, school_id')
      .eq('id', authData.user.id)
      .single()

    const profileData = profile as { family_id: string | null; school_id: string | null } | null
    if (!profileData?.family_id) {
      setLoading(false)
      return
    }

    setFamilyId(profileData.family_id)

    // Fetch event registrations with payment info
    const { data: eventRegs } = await supabase
      .from('event_registrations')
      .select('id, payment_status, registered_at, event:events(title, fee)')
      .eq('family_id', profileData.family_id)
      .order('registered_at', { ascending: false })

    type EventRegRow = {
      id: string
      payment_status: 'pending' | 'paid' | 'refunded'
      registered_at: string
      event: { title: string; fee: number | null } | null
    }
    const typedEventRegs = eventRegs as EventRegRow[] | null

    if (typedEventRegs) {
      setEventPayments(
        typedEventRegs.map(reg => ({
          id: reg.id,
          event_title: reg.event?.title || 'Unknown Event',
          amount: reg.event?.fee || 0,
          payment_status: reg.payment_status,
          registered_at: reg.registered_at,
        }))
      )
    }

    // Fetch custom charges
    const { data: charges } = await supabase
      .from('custom_charges')
      .select('id, description, amount, status, due_date, created_at')
      .eq('family_id', profileData.family_id)
      .order('created_at', { ascending: false })

    type ChargeRow = {
      id: string
      description: string
      amount: number
      status: 'pending' | 'paid' | 'cancelled'
      due_date: string | null
      created_at: string
    }
    const typedCharges = charges as ChargeRow[] | null

    if (typedCharges) {
      setCustomCharges(typedCharges)
    }

    // Fetch belt test payments
    const { data: beltPayments } = await supabase
      .from('belt_test_payments')
      .select(`
        id, amount, status, created_at,
        belt_test_fee:belt_test_fees(
          description,
          from_belt:belt_ranks!belt_test_fees_from_belt_id_fkey(name),
          to_belt:belt_ranks!belt_test_fees_to_belt_id_fkey(name)
        )
      `)
      .eq('family_id', profileData.family_id)
      .order('created_at', { ascending: false })

    type BeltPaymentRow = {
      id: string
      amount: number
      status: 'pending' | 'paid' | 'cancelled'
      created_at: string
      belt_test_fee: {
        description: string | null
        from_belt: { name: string } | null
        to_belt: { name: string } | null
      } | null
    }
    const typedBeltPayments = beltPayments as BeltPaymentRow[] | null

    if (typedBeltPayments) {
      setBeltTestPayments(
        typedBeltPayments.map(bp => {
          let desc = 'Belt Test Fee'
          if (bp.belt_test_fee?.from_belt && bp.belt_test_fee?.to_belt) {
            desc = `Belt Test: ${bp.belt_test_fee.from_belt.name} → ${bp.belt_test_fee.to_belt.name}`
          } else if (bp.belt_test_fee?.description) {
            desc = bp.belt_test_fee.description
          }
          return {
            id: bp.id,
            description: desc,
            amount: bp.amount,
            status: bp.status,
            created_at: bp.created_at,
          }
        })
      )
    }

    // Fetch membership info
    const { data: membershipData } = await supabase
      .from('family_memberships')
      .select('id, status, current_period_start, current_period_end, membership:memberships(name)')
      .eq('family_id', profileData.family_id)
      .single()

    type MembershipRow = {
      id: string
      status: 'active' | 'paused' | 'cancelled'
      current_period_start: string | null
      current_period_end: string | null
      membership: { name: string } | null
    }
    const typedMembership = membershipData as MembershipRow | null

    if (typedMembership) {
      setMembership({
        id: typedMembership.id,
        membership_name: typedMembership.membership?.name || 'Unknown Plan',
        status: typedMembership.status,
        current_period_start: typedMembership.current_period_start,
        current_period_end: typedMembership.current_period_end,
      })
    }

    setLoading(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatAmount = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            {status === 'active' ? 'Active' : 'Paid'}
          </Badge>
        )
      case 'pending':
        return (
          <Badge className="bg-amber-100 text-amber-700">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
      case 'refunded':
        return (
          <Badge className="bg-blue-100 text-blue-700">
            <RefreshCw className="h-3 w-3 mr-1" />
            Refunded
          </Badge>
        )
      case 'cancelled':
      case 'paused':
        return (
          <Badge className="bg-gray-100 text-gray-700">
            <XCircle className="h-3 w-3 mr-1" />
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  const openPaymentModal = (
    type: 'custom_charge' | 'event' | 'belt_test',
    id: string,
    amount: number,
    description: string
  ) => {
    setPaymentModal({
      isOpen: true,
      amount,
      description,
      paymentType: type,
      paymentId: id,
    })
  }

  const handlePaymentSuccess = () => {
    setPaymentModal(prev => ({ ...prev, isOpen: false }))
    fetchData() // Refresh data
  }

  const totalPending = [
    ...customCharges.filter(c => c.status === 'pending').map(c => c.amount),
    ...eventPayments.filter(p => p.payment_status === 'pending' && p.amount > 0).map(p => p.amount),
    ...beltTestPayments.filter(b => b.status === 'pending').map(b => b.amount),
  ].reduce((sum, amount) => sum + amount, 0)

  const totalPaid = [
    ...eventPayments.filter(p => p.payment_status === 'paid').map(p => p.amount),
    ...customCharges.filter(c => c.status === 'paid').map(c => c.amount),
    ...beltTestPayments.filter(b => b.status === 'paid').map(b => b.amount),
  ].reduce((sum, amount) => sum + amount, 0)

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!familyId) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No Payment History</h3>
            <p className="text-gray-500">You need to be part of a family to view payment history.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          Payments
        </h1>
        <p className="text-gray-500 text-sm">Manage your payment methods and view billing history</p>
      </div>

      {/* Card Management */}
      <div className="mb-6">
        <CardManagement />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-xl font-bold text-amber-600">{formatAmount(totalPending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Paid</p>
                <p className="text-xl font-bold text-green-600">{formatAmount(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Transactions</p>
                <p className="text-xl font-bold">{eventPayments.length + customCharges.length + beltTestPayments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Membership Status */}
      {membership && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5" />
              Membership
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{membership.membership_name}</p>
                {membership.current_period_end && (
                  <p className="text-sm text-gray-500">
                    {membership.status === 'active' ? 'Renews' : 'Ended'}: {formatDate(membership.current_period_end)}
                  </p>
                )}
              </div>
              {getStatusBadge(membership.status)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Charges - Show pending first */}
      {customCharges.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="h-5 w-5" />
              Charges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {customCharges.map(charge => (
                <div
                  key={charge.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{charge.description}</p>
                    <p className="text-sm text-gray-500">
                      {charge.due_date ? `Due: ${formatDate(charge.due_date)}` : formatDate(charge.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatAmount(charge.amount)}</span>
                    {charge.status === 'pending' ? (
                      <Button
                        size="sm"
                        onClick={() => openPaymentModal('custom_charge', charge.id, charge.amount, charge.description)}
                      >
                        Pay Now
                      </Button>
                    ) : (
                      getStatusBadge(charge.status)
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Belt Test Payments */}
      {beltTestPayments.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="h-5 w-5" />
              Belt Test Fees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {beltTestPayments.map(payment => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{payment.description}</p>
                    <p className="text-sm text-gray-500">{formatDate(payment.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatAmount(payment.amount)}</span>
                    {payment.status === 'pending' ? (
                      <Button
                        size="sm"
                        onClick={() => openPaymentModal('belt_test', payment.id, payment.amount, payment.description)}
                      >
                        Pay Now
                      </Button>
                    ) : (
                      getStatusBadge(payment.status)
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Payments */}
      {eventPayments.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Ticket className="h-5 w-5" />
              Event Registrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {eventPayments.map(payment => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{payment.event_title}</p>
                    <p className="text-sm text-gray-500">{formatDate(payment.registered_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatAmount(payment.amount)}</span>
                    {payment.payment_status === 'pending' && payment.amount > 0 ? (
                      <Button
                        size="sm"
                        onClick={() => openPaymentModal('event', payment.id, payment.amount, payment.event_title)}
                      >
                        Pay Now
                      </Button>
                    ) : (
                      getStatusBadge(payment.payment_status)
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {eventPayments.length === 0 && customCharges.length === 0 && beltTestPayments.length === 0 && !membership && (
        <Card>
          <CardContent className="p-12 text-center">
            <Receipt className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No Payment History</h3>
            <p className="text-gray-500">You don't have any payments or charges yet.</p>
          </CardContent>
        </Card>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal(prev => ({ ...prev, isOpen: false }))}
        amount={paymentModal.amount}
        description={paymentModal.description}
        paymentType={paymentModal.paymentType}
        paymentId={paymentModal.paymentId}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  )
}
