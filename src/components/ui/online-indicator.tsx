'use client'

import { cn } from '@/lib/utils'

interface OnlineIndicatorProps {
  status?: 'online' | 'away' | 'offline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showLabel?: boolean
}

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
}

const statusColors = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  offline: 'bg-gray-400',
}

const statusLabels = {
  online: 'Online',
  away: 'Away',
  offline: 'Offline',
}

export function OnlineIndicator({
  status = 'offline',
  size = 'md',
  className,
  showLabel = false,
}: OnlineIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'rounded-full',
          sizeClasses[size],
          statusColors[status],
          status === 'online' && 'animate-online shadow-glow-green'
        )}
      />
      {showLabel && (
        <span className="text-xs text-gray-500">{statusLabels[status]}</span>
      )}
    </div>
  )
}
