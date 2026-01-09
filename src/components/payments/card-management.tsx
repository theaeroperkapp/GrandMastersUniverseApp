'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CreditCard as CreditCardVisual } from '@/components/ui/credit-card'
import {
  CreditCard,
  Plus,
  Loader2,
  Wallet,
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5" />
            Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-44 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            <Button size="sm" onClick={() => setShowAddCard(true)} className="shadow-sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Card
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {paymentMethods.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 mb-1">No payment methods</h3>
              <p className="text-sm text-gray-500 mb-4">Add a card to make payments easier</p>
              <Button onClick={() => setShowAddCard(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add your first card
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {paymentMethods.map((pm) => (
                <div key={pm.id} className="relative group">
                  <CreditCardVisual
                    brand={pm.brand}
                    last4={pm.last4}
                    expMonth={pm.exp_month}
                    expYear={pm.exp_year}
                    isDefault={pm.is_default}
                    onSetDefault={pm.is_default ? undefined : () => handleSetDefault(pm.id)}
                    onDelete={() => handleDelete(pm.id)}
                  />
                  {/* Loading overlays */}
                  {(settingDefault === pm.id || deleting === pm.id) && (
                    <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                      <Loader2 className="h-8 w-8 text-white animate-spin" />
                    </div>
                  )}
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
