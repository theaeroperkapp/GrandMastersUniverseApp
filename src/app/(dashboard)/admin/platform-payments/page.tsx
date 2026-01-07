'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Payment {
  id: string
  amount: number
  status: string
  description: string | null
  created_at: string
  school: {
    name: string
  } | null
}

export default function PlatformPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [totalRevenue, setTotalRevenue] = useState(0)

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from('platform_payments')
      .select(`
        *,
        school:schools(name)
      `)
      .order('created_at', { ascending: false })

    if (data) {
      const payments = data as unknown as Payment[]
      setPayments(payments)
      const total = payments
        .filter(p => p.status === 'succeeded' || p.status === 'paid')
        .reduce((sum, p) => sum + (p.amount || 0), 0)
      setTotalRevenue(total)
    }
    setLoading(false)
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="p-8">Loading payments...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Platform Payments</h1>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{payments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Monthly Recurring</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$0</div>
          </CardContent>
        </Card>
      </div>

      {payments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No payments recorded yet. Payments will appear here when schools subscribe.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-left p-4 font-medium">School</th>
                  <th className="text-left p-4 font-medium">Description</th>
                  <th className="text-left p-4 font-medium">Amount</th>
                  <th className="text-left p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 text-gray-500">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">{payment.school?.name || 'Unknown'}</td>
                    <td className="p-4 text-gray-500">
                      {payment.description || 'Subscription payment'}
                    </td>
                    <td className="p-4 font-medium">{formatCurrency(payment.amount)}</td>
                    <td className="p-4">
                      <Badge className={getStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
