// Simple in-memory rate limiter
// For production, consider using Redis or a similar distributed store

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean up every minute

interface RateLimitOptions {
  limit: number // Maximum requests allowed
  windowMs: number // Time window in milliseconds
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
}

export function rateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const { limit, windowMs } = options
  const now = Date.now()
  const key = identifier

  let entry = rateLimitStore.get(key)

  // If no entry or entry has expired, create a new one
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + windowMs,
    }
    rateLimitStore.set(key, entry)
    return {
      success: true,
      remaining: limit - 1,
      resetTime: entry.resetTime,
    }
  }

  // Increment the count
  entry.count++

  // Check if limit exceeded
  if (entry.count > limit) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  return {
    success: true,
    remaining: limit - entry.count,
    resetTime: entry.resetTime,
  }
}

// Helper to get IP from request
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback - in development this might be localhost
  return 'unknown'
}
