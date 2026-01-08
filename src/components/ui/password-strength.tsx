'use client'

import { useMemo } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PasswordStrengthProps {
  password: string
}

interface Requirement {
  label: string
  met: boolean
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const requirements = useMemo((): Requirement[] => {
    return [
      { label: 'At least 8 characters', met: password.length >= 8 },
      { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
      { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
      { label: 'Contains number', met: /[0-9]/.test(password) },
      { label: 'Contains special character', met: /[^A-Za-z0-9]/.test(password) },
    ]
  }, [password])

  const strength = useMemo(() => {
    const metCount = requirements.filter(r => r.met).length
    if (metCount === 0) return { level: 0, label: '', color: '' }
    if (metCount <= 2) return { level: 1, label: 'Weak', color: 'bg-red-500' }
    if (metCount <= 3) return { level: 2, label: 'Fair', color: 'bg-orange-500' }
    if (metCount <= 4) return { level: 3, label: 'Good', color: 'bg-yellow-500' }
    return { level: 4, label: 'Strong', color: 'bg-green-500' }
  }, [requirements])

  if (!password) return null

  return (
    <div className="space-y-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                strength.level >= level ? strength.color : 'bg-gray-200'
              )}
            />
          ))}
        </div>
        {strength.label && (
          <span className={cn(
            'text-xs font-medium',
            strength.level <= 1 && 'text-red-600',
            strength.level === 2 && 'text-orange-600',
            strength.level === 3 && 'text-yellow-600',
            strength.level === 4 && 'text-green-600'
          )}>
            {strength.label}
          </span>
        )}
      </div>

      {/* Requirements checklist */}
      <div className="space-y-1">
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            {req.met ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <X className="h-3 w-3 text-gray-300" />
            )}
            <span className={req.met ? 'text-green-600' : 'text-gray-500'}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
