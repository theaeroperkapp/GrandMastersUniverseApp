import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check if key is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({
        error: 'STRIPE_SECRET_KEY not configured',
        keyPresent: false
      }, { status: 500 })
    }

    const key = process.env.STRIPE_SECRET_KEY

    // Test with direct fetch to Stripe API
    const response = await fetch('https://api.stripe.com/v1/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        keyPresent: true,
        keyPrefix: key.substring(0, 12) + '...',
        httpStatus: response.status,
        stripeError: data.error?.message || 'Unknown Stripe error',
        errorType: data.error?.type,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      keyPresent: true,
      keyPrefix: key.substring(0, 12) + '...',
      balanceAvailable: data.available?.length > 0,
      testMode: key.startsWith('sk_test'),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      success: false,
      keyPresent: !!process.env.STRIPE_SECRET_KEY,
      keyPrefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 12) + '...' : 'none',
      error: errorMessage,
      errorType: 'fetch_error'
    }, { status: 500 })
  }
}
