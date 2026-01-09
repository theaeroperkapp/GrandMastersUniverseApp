'use client'

import { ReactNode } from 'react'
import { PresenceProvider } from '@/contexts/presence-context'

interface DashboardClientWrapperProps {
  children: ReactNode
  userId: string | null
  schoolId: string | null
  userName?: string
}

export function DashboardClientWrapper({
  children,
  userId,
  schoolId,
  userName,
}: DashboardClientWrapperProps) {
  return (
    <PresenceProvider userId={userId} schoolId={schoolId} userName={userName}>
      {children}
    </PresenceProvider>
  )
}
