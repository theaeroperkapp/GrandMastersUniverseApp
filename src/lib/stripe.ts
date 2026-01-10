import Stripe from 'stripe'

// Use a placeholder during build time to avoid errors
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_placeholder_for_build'

export const stripe = new Stripe(stripeSecretKey, {
  typescript: true,
  maxNetworkRetries: 3,
})

// Direct fetch helper for Stripe API (bypasses SDK issues in serverless)
async function stripeApiFetch(endpoint: string, method: string = 'GET', body?: Record<string, unknown>) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  }

  let formBody: string | undefined
  if (body) {
    const params = new URLSearchParams()
    const flatten = (obj: Record<string, unknown>, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}[${key}]` : key
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          flatten(value as Record<string, unknown>, fullKey)
        } else if (value !== undefined && value !== null) {
          params.append(fullKey, String(value))
        }
      }
    }
    flatten(body)
    formBody = params.toString()
  }

  const response = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method,
    headers,
    body: formBody,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error?.message || 'Stripe API error')
  }

  return data
}

export async function createCustomer(email: string, name: string, metadata?: Record<string, string>) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }

  // Use direct fetch to avoid SDK connection issues
  const body: Record<string, unknown> = { email, name }
  if (metadata) {
    body.metadata = metadata
  }

  return stripeApiFetch('/customers', 'POST', body)
}

export async function createSubscription(
  customerId: string,
  priceId: string,
  trialDays?: number
) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    trial_period_days: trialDays,
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  })
}

export async function cancelSubscription(subscriptionId: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return stripe.subscriptions.cancel(subscriptionId)
}

export async function createPaymentIntent(
  amount: number,
  currency: string = 'usd',
  customerId?: string,
  metadata?: Record<string, string>
) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  // Use direct fetch to avoid SDK connection issues
  const body: Record<string, unknown> = {
    amount,
    currency,
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
  }
  if (customerId) body.customer = customerId
  if (metadata) body.metadata = metadata
  return stripeApiFetch('/payment_intents', 'POST', body)
}

export async function createRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: Stripe.RefundCreateParams.Reason
) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount,
    reason,
  })
}

export async function getCustomerPaymentMethods(customerId: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  // Use direct fetch to avoid SDK connection issues
  return stripeApiFetch(`/payment_methods?customer=${customerId}&type=card`, 'GET')
}

export async function attachPaymentMethod(paymentMethodId: string, customerId: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  // Use direct fetch to avoid SDK connection issues
  return stripeApiFetch(`/payment_methods/${paymentMethodId}/attach`, 'POST', {
    customer: customerId,
  })
}

export async function setDefaultPaymentMethod(customerId: string, paymentMethodId: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  // Use direct fetch to avoid SDK connection issues
  return stripeApiFetch(`/customers/${customerId}`, 'POST', {
    invoice_settings: { default_payment_method: paymentMethodId },
  })
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
) {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}

// Create SetupIntent for saving cards without immediate payment
export async function createSetupIntent(customerId: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }

  // Use direct fetch to avoid SDK connection issues
  return stripeApiFetch('/setup_intents', 'POST', {
    customer: customerId,
    usage: 'off_session',
    automatic_payment_methods: { enabled: true },
  })
}

// Detach a payment method from customer
export async function detachPaymentMethod(paymentMethodId: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return stripe.paymentMethods.detach(paymentMethodId)
}

// Get customer with default payment method
export async function getCustomer(customerId: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  // Use direct fetch to avoid SDK connection issues
  return stripeApiFetch(`/customers/${customerId}`, 'GET')
}

// Create PaymentIntent with immediate confirmation using saved card
export async function createAndConfirmPayment(
  amount: number,
  currency: string,
  customerId: string,
  paymentMethodId: string,
  metadata?: Record<string, string>
) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  // Use direct fetch to avoid SDK connection issues
  const body: Record<string, unknown> = {
    amount,
    currency,
    customer: customerId,
    payment_method: paymentMethodId,
    confirm: true,
    off_session: true,
  }
  if (metadata) body.metadata = metadata
  return stripeApiFetch('/payment_intents', 'POST', body)
}

// Confirm an existing PaymentIntent
export async function confirmPaymentIntent(
  paymentIntentId: string,
  paymentMethodId: string
) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  // Use direct fetch to avoid SDK connection issues
  return stripeApiFetch(`/payment_intents/${paymentIntentId}/confirm`, 'POST', {
    payment_method: paymentMethodId,
  })
}

// Create subscription with default payment method (for in-app payment)
export async function createSubscriptionWithPaymentMethod(
  customerId: string,
  priceId: string,
  paymentMethodId: string,
  trialDays?: number
) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }

  // Set default payment method first
  await setDefaultPaymentMethod(customerId, paymentMethodId)

  // Use direct fetch to avoid SDK connection issues
  const body: Record<string, unknown> = {
    customer: customerId,
    items: [{ price: priceId }],
    default_payment_method: paymentMethodId,
    'expand[]': 'latest_invoice.payment_intent',
  }
  if (trialDays) body.trial_period_days = trialDays
  return stripeApiFetch('/subscriptions', 'POST', body)
}

// =====================
// STRIPE CONNECT
// =====================

// Create a Stripe Connect Express account for a school owner
export async function createConnectAccount(
  email: string,
  metadata?: Record<string, string>
) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  // Use direct fetch to avoid SDK connection issues in serverless
  const body: Record<string, unknown> = {
    type: 'express',
    email,
    'capabilities[card_payments][requested]': true,
    'capabilities[transfers][requested]': true,
  }
  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      body[`metadata[${key}]`] = value
    }
  }
  return stripeApiFetch('/accounts', 'POST', body)
}

// Create an account link for Connect onboarding
export async function createConnectAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  // Use direct fetch to avoid SDK connection issues in serverless
  return stripeApiFetch('/account_links', 'POST', {
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  })
}

// Get Connect account details
export async function getConnectAccount(accountId: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  // Use direct fetch to avoid SDK connection issues in serverless
  return stripeApiFetch(`/accounts/${accountId}`, 'GET')
}

// Create a login link for Connect dashboard
export async function createConnectLoginLink(accountId: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  // Use direct fetch to avoid SDK connection issues in serverless
  return stripeApiFetch(`/accounts/${accountId}/login_links`, 'POST', {})
}

// Create PaymentIntent with Connect destination (for school payments)
export async function createConnectPaymentIntent(
  amount: number,
  currency: string,
  connectedAccountId: string,
  applicationFeeAmount: number,
  customerId?: string,
  metadata?: Record<string, string>
) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  // Use direct fetch to avoid SDK connection issues
  const body: Record<string, unknown> = {
    amount,
    currency,
    automatic_payment_methods: { enabled: true },
    application_fee_amount: applicationFeeAmount,
    transfer_data: { destination: connectedAccountId },
  }
  if (customerId) body.customer = customerId
  if (metadata) body.metadata = metadata
  return stripeApiFetch('/payment_intents', 'POST', body)
}

// Create and confirm payment with Connect destination using saved card
export async function createAndConfirmConnectPayment(
  amount: number,
  currency: string,
  connectedAccountId: string,
  applicationFeeAmount: number,
  customerId: string,
  paymentMethodId: string,
  metadata?: Record<string, string>
) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  // Use direct fetch to avoid SDK connection issues
  const body: Record<string, unknown> = {
    amount,
    currency,
    customer: customerId,
    payment_method: paymentMethodId,
    confirm: true,
    off_session: true,
    application_fee_amount: applicationFeeAmount,
    transfer_data: { destination: connectedAccountId },
  }
  if (metadata) body.metadata = metadata
  return stripeApiFetch('/payment_intents', 'POST', body)
}
