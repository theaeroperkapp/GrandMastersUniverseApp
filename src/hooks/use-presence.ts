'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

interface PresenceState {
  userId: string
  full_name?: string
  online_at: string
  status: 'online' | 'away'
}

interface UsePresenceOptions {
  schoolId: string | null
  userId: string | null
  userName?: string
}

interface UsePresenceReturn {
  onlineUsers: Set<string>
  isUserOnline: (userId: string) => boolean
  presenceCount: number
}

export function usePresence({ schoolId, userId, userName }: UsePresenceOptions): UsePresenceReturn {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(createClient())

  const isUserOnline = useCallback((targetUserId: string) => {
    return onlineUsers.has(targetUserId)
  }, [onlineUsers])

  useEffect(() => {
    if (!schoolId || !userId) return

    const supabase = supabaseRef.current
    const channelName = `presence:school:${schoolId}`

    // Clean up existing channel if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const online = new Set<string>()

        Object.keys(state).forEach((key) => {
          online.add(key)
        })

        setOnlineUsers(online)
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev)
          next.add(key)
          return next
        })
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track this user's presence
          await channel.track({
            userId,
            full_name: userName,
            online_at: new Date().toISOString(),
            status: 'online',
          } as PresenceState)
        }
      })

    channelRef.current = channel

    // Handle visibility change (user switches tabs)
    const handleVisibilityChange = async () => {
      if (channelRef.current) {
        if (document.visibilityState === 'visible') {
          await channelRef.current.track({
            userId,
            full_name: userName,
            online_at: new Date().toISOString(),
            status: 'online',
          } as PresenceState)
        } else {
          await channelRef.current.track({
            userId,
            full_name: userName,
            online_at: new Date().toISOString(),
            status: 'away',
          } as PresenceState)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Heartbeat to keep presence alive
    const heartbeat = setInterval(async () => {
      if (channelRef.current && document.visibilityState === 'visible') {
        await channelRef.current.track({
          userId,
          full_name: userName,
          online_at: new Date().toISOString(),
          status: 'online',
        } as PresenceState)
      }
    }, 30000) // Every 30 seconds

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(heartbeat)
      if (channelRef.current) {
        channelRef.current.untrack()
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [schoolId, userId, userName])

  return {
    onlineUsers,
    isUserOnline,
    presenceCount: onlineUsers.size,
  }
}
