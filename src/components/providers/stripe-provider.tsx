'use client'

import { ReactNode } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe, type Stripe } from '@stripe/stripe-js'

const stripePromise: Promise<Stripe | null> = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
)

interface StripeProviderProps {
  children: ReactNode
  clientSecret?: string
}

export function StripeProvider({ children, clientSecret }: StripeProviderProps) {
  const options = clientSecret
    ? {
        clientSecret,
        appearance: {
          theme: 'stripe' as const,
          variables: {
            colorPrimary: '#dc2626',
            borderRadius: '8px',
          },
        },
      }
    : undefined

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  )
}
