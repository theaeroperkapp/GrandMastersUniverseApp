'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { CreditCard, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
)

interface AddCardModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

function AddCardForm({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create setup intent
      const setupResponse = await fetch('/api/payment-methods', {
        method: 'POST',
      })
      const setupData = await setupResponse.json()

      if (!setupResponse.ok) {
        throw new Error(setupData.error || 'Failed to create setup intent')
      }

      // Confirm card setup
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error('Card element not found')
      }

      const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(
        setupData.client_secret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      )

      if (confirmError) {
        throw new Error(confirmError.message)
      }

      if (setupIntent?.status === 'succeeded') {
        toast.success('Card added successfully')
        onSuccess()
      } else {
        throw new Error('Card setup failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add card'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Details
        </label>
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
      </div>

      {error && (
        <p className="text-red-600 text-sm mb-4">{error}</p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !stripe}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Add Card
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

export function AddCardModal({ isOpen, onClose, onSuccess }: AddCardModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Payment Method">
      <Elements stripe={stripePromise}>
        <AddCardForm onSuccess={onSuccess} onClose={onClose} />
      </Elements>
    </Modal>
  )
}
