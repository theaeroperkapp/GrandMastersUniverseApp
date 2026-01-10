'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

interface PresenceUser {
  userId: string
  full_name?: string
  online_at: string
  status: 'online' | 'away'
  presence_ref?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PresencePayload = any

interface PresenceContextType {
  onlineUsers: Map<string, PresenceUser>
  isUserOnline: (userId: string) => boolean
  getUserStatus: (userId: string) => 'online' | 'away' | 'offline'
  presenceCount: number
  isConnected: boolean
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUsers: new Map(),
  isUserOnline: () => false,
  getUserStatus: () => 'offline',
  presenceCount: 0,
  isConnected: false,
})

export function usePresenceContext() {
  return useContext(PresenceContext)
}

interface PresenceProviderProps {
  children: ReactNode
  schoolId: string | null
  userId: string | null
  userName?: string
}

export function PresenceProvider({ children, schoolId, userId, userName }: PresenceProviderProps) {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, PresenceUser>>(new Map())
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(createClient())
  const userNameRef = useRef(userName)

  // Keep userName ref updated
  userNameRef.current = userName

  const isUserOnline = useCallback((targetUserId: string) => {
    const user = onlineUsers.get(targetUserId)
    return user?.status === 'online'
  }, [onlineUsers])

  const getUserStatus = useCallback((targetUserId: string): 'online' | 'away' | 'offline' => {
    const user = onlineUsers.get(targetUserId)
    if (!user) return 'offline'
    return user.status
  }, [onlineUsers])

  useEffect(() => {
    if (!schoolId || !userId) {
      console.log('[Presence] Missing schoolId or userId:', { schoolId, userId })
      setIsConnected(false)
      return
    }

    const supabase = supabaseRef.current
    const channelName = `presence:school:${schoolId}`
    console.log('[Presence] Setting up channel:', channelName, 'for user:', userId)

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
        const users = new Map<string, PresenceUser>()

        Object.entries(state).forEach(([key, presences]) => {
          // Get the most recent presence for this user
          const presence = (presences as PresencePayload[])[0]
          if (presence) {
            users.set(key, {
              userId: key,
              full_name: presence.full_name,
              online_at: presence.online_at,
              status: presence.status || 'online',
            })
          }
        })

        console.log('[Presence] Sync - Online users:', users.size, Array.from(users.keys()))
        setOnlineUsers(users)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const presence = (newPresences as PresencePayload[])[0]
        if (presence) {
          setOnlineUsers((prev) => {
            const next = new Map(prev)
            next.set(key, {
              userId: key,
              full_name: presence.full_name,
              online_at: presence.online_at,
              status: presence.status || 'online',
            })
            return next
          })
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers((prev) => {
          const next = new Map(prev)
          next.delete(key)
          return next
        })
      })
      .subscribe(async (status, err) => {
        console.log('[Presence] Channel status:', status, err ? `Error: ${err.message}` : '')
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          // Track this user's presence
          try {
            await channel.track({
              userId,
              full_name: userNameRef.current,
              online_at: new Date().toISOString(),
              status: 'online',
            })
            console.log('[Presence] Successfully tracked user:', userId)
          } catch (trackError) {
            console.error('[Presence] Error tracking user:', trackError)
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[Presence] Channel disconnected:', status)
          setIsConnected(false)
        }
      })

    channelRef.current = channel

    // Handle visibility change (user switches tabs)
    const handleVisibilityChange = async () => {
      if (channelRef.current) {
        const newStatus = document.visibilityState === 'visible' ? 'online' : 'away'
        await channelRef.current.track({
          userId,
          full_name: userNameRef.current,
          online_at: new Date().toISOString(),
          status: newStatus,
        })
      }
    }

    // Handle before unload (user closes tab/browser)
    const handleBeforeUnload = () => {
      if (channelRef.current) {
        channelRef.current.untrack()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Heartbeat to keep presence alive (every 30 seconds)
    const heartbeat = setInterval(async () => {
      if (channelRef.current && document.visibilityState === 'visible') {
        await channelRef.current.track({
          userId,
          full_name: userNameRef.current,
          online_at: new Date().toISOString(),
          status: 'online',
        })
      }
    }, 30000)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      clearInterval(heartbeat)
      if (channelRef.current) {
        channelRef.current.untrack()
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsConnected(false)
    }
  // Note: userName is intentionally excluded from deps to prevent reconnection on name changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, userId])

  return (
    <PresenceContext.Provider
      value={{
        onlineUsers,
        isUserOnline,
        getUserStatus,
        presenceCount: onlineUsers.size,
        isConnected,
      }}
    >
      {children}
    </PresenceContext.Provider>
  )
}
