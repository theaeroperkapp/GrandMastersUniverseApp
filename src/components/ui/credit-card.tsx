'use client'

import { cn } from '@/lib/utils'
import { Star, Trash2 } from 'lucide-react'

interface CreditCardProps {
  brand: string
  last4: string
  expMonth: number
  expYear: number
  holderName?: string
  isDefault?: boolean
  onSetDefault?: () => void
  onDelete?: () => void
  className?: string
}

const brandGradients: Record<string, string> = {
  visa: 'card-visa',
  mastercard: 'card-mastercard',
  amex: 'card-amex',
  discover: 'bg-gradient-to-br from-orange-500 to-orange-700',
  default: 'card-default',
}

const brandLogos: Record<string, string> = {
  visa: 'VISA',
  mastercard: 'MC',
  amex: 'AMEX',
  discover: 'DISC',
}

export function CreditCard({
  brand,
  last4,
  expMonth,
  expYear,
  holderName,
  isDefault = false,
  onSetDefault,
  onDelete,
  className,
}: CreditCardProps) {
  const brandLower = brand.toLowerCase()
  const gradientClass = brandGradients[brandLower] || brandGradients.default
  const brandLogo = brandLogos[brandLower] || brand.toUpperCase()

  return (
    <div
      className={cn(
        'relative w-full max-w-sm aspect-[1.6/1] rounded-xl p-5 text-white overflow-hidden hover-lift cursor-pointer group',
        gradientClass,
        className
      )}
    >
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />

      {/* Pattern overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-4 right-4 w-24 h-24 rounded-full border-2 border-white/30" />
        <div className="absolute top-8 right-8 w-16 h-16 rounded-full border-2 border-white/20" />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col justify-between">
        {/* Top row */}
        <div className="flex items-start justify-between">
          <div className="text-lg font-bold tracking-wider">{brandLogo}</div>
          {isDefault && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              Default
            </div>
          )}
        </div>

        {/* Card number */}
        <div className="space-y-1">
          <div className="text-xl font-mono tracking-widest">
            •••• •••• •••• {last4}
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex items-end justify-between">
          <div>
            {holderName && (
              <div className="text-xs text-white/70 mb-0.5">Card Holder</div>
            )}
            <div className="text-sm font-medium uppercase tracking-wide">
              {holderName || 'Card Holder'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/70 mb-0.5">Expires</div>
            <div className="text-sm font-medium">
              {String(expMonth).padStart(2, '0')}/{String(expYear).slice(-2)}
            </div>
          </div>
        </div>
      </div>

      {/* Hover actions */}
      {(onSetDefault || onDelete) && (
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity flex items-center justify-center gap-3">
          {!isDefault && onSetDefault && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSetDefault()
              }}
              className="px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              Set Default
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Compact card display for lists
export function CreditCardCompact({
  brand,
  last4,
  expMonth,
  expYear,
  isDefault = false,
  isSelected = false,
  onClick,
  className,
}: CreditCardProps & { isSelected?: boolean; onClick?: () => void }) {
  const brandLower = brand.toLowerCase()
  const brandLogo = brandLogos[brandLower] || brand.toUpperCase()

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all',
        isSelected
          ? 'border-red-500 bg-red-50'
          : 'border-gray-200 hover:border-gray-300 bg-white',
        className
      )}
    >
      {/* Mini card icon */}
      <div
        className={cn(
          'w-12 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold',
          brandGradients[brandLower] || brandGradients.default
        )}
      >
        {brandLogo}
      </div>

      {/* Details */}
      <div className="flex-1 text-left">
        <div className="text-sm font-medium text-gray-900">
          •••• {last4}
        </div>
        <div className="text-xs text-gray-500">
          Expires {String(expMonth).padStart(2, '0')}/{String(expYear).slice(-2)}
        </div>
      </div>

      {/* Default badge */}
      {isDefault && (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 rounded-full text-xs font-medium text-amber-700">
          <Star className="w-3 h-3 fill-amber-500" />
          Default
        </div>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  )
}
