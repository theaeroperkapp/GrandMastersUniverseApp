import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET() {
  try {
    // Check if key is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({
        error: 'STRIPE_SECRET_KEY not configured',
        keyPresent: false
      }, { status: 500 })
    }

    // Test Stripe connection by retrieving balance
    const balance = await stripe.balance.retrieve()

    return NextResponse.json({
      success: true,
      keyPresent: true,
      keyPrefix: process.env.STRIPE_SECRET_KEY.substring(0, 7) + '...',
      balanceAvailable: balance.available.length > 0,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      success: false,
      keyPresent: !!process.env.STRIPE_SECRET_KEY,
      keyPrefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 7) + '...' : 'none',
      error: errorMessage,
    }, { status: 500 })
  }
}
