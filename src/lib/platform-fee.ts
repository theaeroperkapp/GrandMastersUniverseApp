/**
 * Platform fee calculation for student payments
 *
 * - Founding partner (lifetime) schools: $1 + tax per payment goes to platform
 * - Standard/trial schools: No platform fee (they pay $99/mo subscription)
 */

// Platform fee in cents for lifetime subscriptions
const LIFETIME_PLATFORM_FEE_CENTS = 100 // $1.00

// Tax rate (adjust as needed)
const TAX_RATE = 0.0 // Set to 0 for now, can be updated based on location

export interface PlatformFeeResult {
  platformFee: number // in cents
  schoolReceives: number // in cents (after platform fee, before Stripe fees)
  isLifetimeSubscription: boolean
}

/**
 * Calculate platform fee for a student payment
 * @param amountCents - Total payment amount in cents
 * @param subscriptionPlan - School's subscription plan
 * @returns Platform fee breakdown
 */
export function calculatePlatformFee(
  amountCents: number,
  subscriptionPlan: string | null
): PlatformFeeResult {
  const isLifetimeSubscription = subscriptionPlan === 'founding_partner'

  if (isLifetimeSubscription) {
    const baseFee = LIFETIME_PLATFORM_FEE_CENTS
    const tax = Math.round(baseFee * TAX_RATE)
    const platformFee = baseFee + tax

    return {
      platformFee,
      schoolReceives: amountCents - platformFee,
      isLifetimeSubscription: true,
    }
  }

  // Standard/trial subscriptions - no platform fee on student payments
  return {
    platformFee: 0,
    schoolReceives: amountCents,
    isLifetimeSubscription: false,
  }
}

/**
 * Check if a school can accept payments
 * @param stripeAccountId - School's Stripe Connect account ID
 * @param subscriptionStatus - School's subscription status
 * @returns Whether the school can accept payments and any error message
 */
export function canAcceptPayments(
  stripeAccountId: string | null,
  subscriptionStatus: string | null
): { canAccept: boolean; error?: string } {
  if (!stripeAccountId) {
    return {
      canAccept: false,
      error: 'School has not set up payment processing',
    }
  }

  // Allow payments for active, trial, or founding_partner schools
  const validStatuses = ['active', 'trial', 'trialing']
  const validPlans = ['founding_partner', 'standard', 'trial']

  // For now, allow if they have a Connect account set up
  // The Connect account status check happens in the API
  return { canAccept: true }
}
