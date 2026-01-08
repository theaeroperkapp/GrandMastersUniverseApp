'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import {
  CreditCard,
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
} from 'lucide-react'
import toast from 'react-hot-toast'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
)

interface PaymentMethod {
  id: string
  brand: string
  last4: string
  exp_month: number
  exp_year: number
  is_default: boolean
}

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  amount: number
  description: string
  paymentType: 'custom_charge' | 'event' | 'belt_test' | 'subscription'
  paymentId: string
  onSuccess?: () => void
  onFailure?: (error: string) => void
}

function PaymentForm({
  amount,
  description,
  paymentType,
  paymentId,
  onSuccess,
  onFailure,
  onClose,
}: {
  amount: number
  description: string
  paymentType: string
  paymentId: string
  onSuccess?: () => void
  onFailure?: (error: string) => void
  onClose: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [fetchingCards, setFetchingCards] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [useNewCard, setUseNewCard] = useState(false)
  const [saveCard, setSaveCard] = useState(true)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'failed'>('idle')

  useEffect(() => {
    fetchPaymentMethods()
  }, [])

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/payment-methods')
      const data = await response.json()

      if (response.ok && data.payment_methods?.length > 0) {
        setPaymentMethods(data.payment_methods)
        // Select default card
        const defaultCard = data.payment_methods.find((pm: PaymentMethod) => pm.is_default)
        if (defaultCard) {
          setSelectedCard(defaultCard.id)
        } else {
          setSelectedCard(data.payment_methods[0].id)
        }
      } else {
        setUseNewCard(true)
      }
    } catch {
      setUseNewCard(true)
    } finally {
      setFetchingCards(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe) return

    setLoading(true)
    setError(null)

    try {
      const endpoint = `/api/pay/${paymentType.replace('_', '-')}`
      const body: Record<string, unknown> = {
        [`${paymentType}_id`]: paymentId,
        payment_id: paymentId,
      }

      if (useNewCard) {
        // Pay with new card
        if (!elements) {
          throw new Error('Card element not available')
        }

        const cardElement = elements.getElement(CardElement)
        if (!cardElement) {
          throw new Error('Card element not found')
        }

        // Create payment intent first
        body.save_card = saveCard

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Payment failed')
        }

        if (data.client_secret) {
          // Confirm with new card
          const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
            data.client_secret,
            {
              payment_method: {
                card: cardElement,
              },
              setup_future_usage: saveCard ? 'off_session' : undefined,
            }
          )

          if (confirmError) {
            throw new Error(confirmError.message)
          }

          if (paymentIntent?.status === 'succeeded') {
            setPaymentStatus('success')
            toast.success('Payment successful!')
            setTimeout(() => {
              onSuccess?.()
              onClose()
            }, 1500)
            return
          }
        } else if (data.success) {
          // Payment already confirmed
          setPaymentStatus('success')
          toast.success('Payment successful!')
          setTimeout(() => {
            onSuccess?.()
            onClose()
          }, 1500)
          return
        }
      } else {
        // Pay with saved card
        if (!selectedCard) {
          throw new Error('Please select a card')
        }

        body.payment_method_id = selectedCard

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Payment failed')
        }

        if (data.success || data.status === 'succeeded') {
          setPaymentStatus('success')
          toast.success('Payment successful!')
          setTimeout(() => {
            onSuccess?.()
            onClose()
          }, 1500)
          return
        }

        if (data.client_secret && data.requires_action) {
          // Handle 3D Secure
          const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
            data.client_secret
          )

          if (confirmError) {
            throw new Error(confirmError.message)
          }

          if (paymentIntent?.status === 'succeeded') {
            setPaymentStatus('success')
            toast.success('Payment successful!')
            setTimeout(() => {
              onSuccess?.()
              onClose()
            }, 1500)
            return
          }
        }
      }

      throw new Error('Payment could not be completed')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed'
      setError(errorMessage)
      setPaymentStatus('failed')
      toast.error(errorMessage)
      onFailure?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const formattedAmount = `$${(amount / 100).toFixed(2)}`

  if (paymentStatus === 'success') {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Payment Successful!</h3>
        <p className="text-gray-500">{formattedAmount} for {description}</p>
      </div>
    )
  }

  if (fetchingCards) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Payment Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">{description}</span>
          <span className="text-xl font-bold">{formattedAmount}</span>
        </div>
      </div>

      {/* Card Selection */}
      {paymentMethods.length > 0 && !useNewCard && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Card
          </label>
          <div className="space-y-2">
            {paymentMethods.map((pm) => (
              <label
                key={pm.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedCard === pm.id
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="card"
                  value={pm.id}
                  checked={selectedCard === pm.id}
                  onChange={() => setSelectedCard(pm.id)}
                  className="text-red-600"
                />
                <CreditCard className="h-5 w-5 text-gray-400" />
                <span className="capitalize">{pm.brand}</span>
                <span className="text-gray-500">•••• {pm.last4}</span>
                <span className="text-gray-400 text-sm">
                  {pm.exp_month.toString().padStart(2, '0')}/{pm.exp_year}
                </span>
              </label>
            ))}
            <button
              type="button"
              onClick={() => setUseNewCard(true)}
              className="flex items-center gap-2 w-full p-3 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Use a different card
            </button>
          </div>
        </div>
      )}

      {/* New Card Input */}
      {useNewCard && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Card Details
            </label>
            {paymentMethods.length > 0 && (
              <button
                type="button"
                onClick={() => setUseNewCard(false)}
                className="text-sm text-red-600 hover:underline"
              >
                Use saved card
              </button>
            )}
          </div>
          <div className="border rounded-lg p-3 bg-white">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#374151',
                    '::placeholder': {
                      color: '#9ca3af',
                    },
                  },
                  invalid: {
                    color: '#dc2626',
                  },
                },
              }}
            />
          </div>
          <label className="flex items-center gap-2 mt-3 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={saveCard}
              onChange={(e) => setSaveCard(e.target.checked)}
              className="rounded text-red-600"
            />
            Save card for future payments
          </label>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !stripe}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay ${formattedAmount}`
          )}
        </Button>
      </div>
    </form>
  )
}

export function PaymentModal({
  isOpen,
  onClose,
  amount,
  description,
  paymentType,
  paymentId,
  onSuccess,
  onFailure,
}: PaymentModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Payment">
      <Elements stripe={stripePromise}>
        <PaymentForm
          amount={amount}
          description={description}
          paymentType={paymentType}
          paymentId={paymentId}
          onSuccess={onSuccess}
          onFailure={onFailure}
          onClose={onClose}
        />
      </Elements>
    </Modal>
  )
}
