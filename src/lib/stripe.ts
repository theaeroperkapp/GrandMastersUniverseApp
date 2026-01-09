import Stripe from 'stripe'

// Use a placeholder during build time to avoid errors
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_placeholder_for_build'

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-12-18.acacia' as any,
  typescript: true,
})

export async function createCustomer(email: string, name: string, metadata?: Record<string, string>) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return stripe.customers.create({
    email,
    name,
    metadata,
  })
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
  return stripe.paymentIntents.create({
    amount,
    currency,
    customer: customerId,
    metadata,
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: 'never',
    },
  })
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
  return stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  })
}

export async function attachPaymentMethod(paymentMethodId: string, customerId: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  })
}

export async function setDefaultPaymentMethod(customerId: string, paymentMethodId: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
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
  return stripe.setupIntents.create({
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
  return stripe.customers.retrieve(customerId)
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
  return stripe.paymentIntents.create({
    amount,
    currency,
    customer: customerId,
    payment_method: paymentMethodId,
    confirm: true,
    off_session: true,
    metadata,
  })
}

// Confirm an existing PaymentIntent
export async function confirmPaymentIntent(
  paymentIntentId: string,
  paymentMethodId: string
) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return stripe.paymentIntents.confirm(paymentIntentId, {
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

  return stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    trial_period_days: trialDays,
    default_payment_method: paymentMethodId,
    expand: ['latest_invoice.payment_intent'],
  })
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
  return stripe.accounts.create({
    type: 'express',
    email,
    metadata,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  })
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
  return stripe.accountLinks.create({
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
  return stripe.accounts.retrieve(accountId)
}

// Create a login link for Connect dashboard
export async function createConnectLoginLink(accountId: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return stripe.accounts.createLoginLink(accountId)
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
  return stripe.paymentIntents.create({
    amount,
    currency,
    customer: customerId,
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
    application_fee_amount: applicationFeeAmount,
    transfer_data: {
      destination: connectedAccountId,
    },
  })
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
  return stripe.paymentIntents.create({
    amount,
    currency,
    customer: customerId,
    payment_method: paymentMethodId,
    confirm: true,
    off_session: true,
    metadata,
    application_fee_amount: applicationFeeAmount,
    transfer_data: {
      destination: connectedAccountId,
    },
  })
}
