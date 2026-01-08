'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CreditCard,
  Trash2,
  Star,
  Plus,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { AddCardModal } from './add-card-modal'

interface PaymentMethod {
  id: string
  brand: string
  last4: string
  exp_month: number
  exp_year: number
  is_default: boolean
}

interface CardManagementProps {
  onCardAdded?: () => void
  onCardRemoved?: () => void
}

export function CardManagement({ onCardAdded, onCardRemoved }: CardManagementProps) {
  const [loading, setLoading] = useState(true)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [showAddCard, setShowAddCard] = useState(false)
  const [settingDefault, setSettingDefault] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchPaymentMethods()
  }, [])

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/payment-methods')
      const data = await response.json()

      if (response.ok) {
        setPaymentMethods(data.payment_methods || [])
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSetDefault = async (paymentMethodId: string) => {
    setSettingDefault(paymentMethodId)
    try {
      const response = await fetch(`/api/payment-methods/${paymentMethodId}/default`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Default card updated')
        await fetchPaymentMethods()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to set default card')
      }
    } catch {
      toast.error('Failed to set default card')
    } finally {
      setSettingDefault(null)
    }
  }

  const handleDelete = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to remove this card?')) return

    setDeleting(paymentMethodId)
    try {
      const response = await fetch(`/api/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Card removed')
        await fetchPaymentMethods()
        onCardRemoved?.()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to remove card')
      }
    } catch {
      toast.error('Failed to remove card')
    } finally {
      setDeleting(null)
    }
  }

  const handleCardAdded = () => {
    setShowAddCard(false)
    fetchPaymentMethods()
    onCardAdded?.()
  }

  const getBrandIcon = (brand: string) => {
    const brandLower = brand.toLowerCase()
    // Return colored text based on brand
    const colors: Record<string, string> = {
      visa: 'text-blue-600',
      mastercard: 'text-orange-600',
      amex: 'text-blue-500',
      discover: 'text-orange-500',
    }
    return colors[brandLower] || 'text-gray-600'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            <Button size="sm" onClick={() => setShowAddCard(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Card
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {paymentMethods.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p>No payment methods saved</p>
              <p className="text-sm">Add a card to make payments easier</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className={`h-8 w-8 ${getBrandIcon(pm.brand)}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">{pm.brand}</span>
                        <span className="text-gray-500">•••• {pm.last4}</span>
                        {pm.is_default && (
                          <Badge className="bg-green-100 text-green-700">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        Expires {pm.exp_month.toString().padStart(2, '0')}/{pm.exp_year}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!pm.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(pm.id)}
                        disabled={settingDefault === pm.id}
                      >
                        {settingDefault === pm.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Set Default'
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(pm.id)}
                      disabled={deleting === pm.id}
                      className="text-red-600 hover:text-red-700"
                    >
                      {deleting === pm.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddCardModal
        isOpen={showAddCard}
        onClose={() => setShowAddCard(false)}
        onSuccess={handleCardAdded}
      />
    </>
  )
}
