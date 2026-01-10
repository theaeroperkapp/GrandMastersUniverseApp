'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PresenceUser {
  userId: string
  full_name?: string
  status: 'online' | 'away' | 'offline'
  last_seen_at: string
}

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

// Consider users online if seen within last 2 minutes
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000
// Heartbeat interval - update presence every 30 seconds
const HEARTBEAT_INTERVAL_MS = 30 * 1000

export function PresenceProvider({ children, schoolId, userId, userName }: PresenceProviderProps) {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, PresenceUser>>(new Map())
  const [isConnected, setIsConnected] = useState(false)
  const supabaseRef = useRef(createClient())
  const userNameRef = useRef(userName)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)

  // Keep userName ref updated
  userNameRef.current = userName

  const isUserOnline = useCallback((targetUserId: string) => {
    const user = onlineUsers.get(targetUserId)
    if (!user) return false
    // Check if last seen is within threshold
    const lastSeen = new Date(user.last_seen_at).getTime()
    const now = Date.now()
    return (now - lastSeen) < ONLINE_THRESHOLD_MS && user.status === 'online'
  }, [onlineUsers])

  const getUserStatus = useCallback((targetUserId: string): 'online' | 'away' | 'offline' => {
    const user = onlineUsers.get(targetUserId)
    if (!user) return 'offline'
    // Check if last seen is within threshold
    const lastSeen = new Date(user.last_seen_at).getTime()
    const now = Date.now()
    if ((now - lastSeen) >= ONLINE_THRESHOLD_MS) return 'offline'
    return user.status
  }, [onlineUsers])

  // Update user's presence in database
  const updatePresence = useCallback(async (status: 'online' | 'away') => {
    if (!userId || !schoolId) return

    const supabase = supabaseRef.current

    try {
      // Upsert presence record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('user_presence') as any)
        .upsert({
          user_id: userId,
          school_id: schoolId,
          status,
          last_seen_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        })
    } catch (error) {
      console.error('[Presence] Error updating presence:', error)
    }
  }, [userId, schoolId])

  // Fetch all online users in the school
  const fetchOnlineUsers = useCallback(async () => {
    if (!schoolId) return

    const supabase = supabaseRef.current
    const threshold = new Date(Date.now() - ONLINE_THRESHOLD_MS).toISOString()

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('user_presence') as any)
        .select('user_id, status, last_seen_at, profiles:user_id(full_name)')
        .eq('school_id', schoolId)
        .gte('last_seen_at', threshold)

      if (error) {
        console.error('[Presence] Error fetching online users:', error)
        return
      }

      const users = new Map<string, PresenceUser>()

      if (data) {
        data.forEach((record: {
          user_id: string
          status: string
          last_seen_at: string
          profiles: { full_name: string } | null
        }) => {
          users.set(record.user_id, {
            userId: record.user_id,
            full_name: record.profiles?.full_name,
            status: record.status as 'online' | 'away' | 'offline',
            last_seen_at: record.last_seen_at,
          })
        })
      }

      setOnlineUsers(users)
      setIsConnected(true)
    } catch (error) {
      console.error('[Presence] Error fetching online users:', error)
    }
  }, [schoolId])

  // Set up presence tracking and realtime subscription
  useEffect(() => {
    if (!schoolId || !userId) {
      setIsConnected(false)
      return
    }

    const supabase = supabaseRef.current

    // Initial presence update and fetch
    updatePresence('online')
    fetchOnlineUsers()

    // Subscribe to presence changes in the school
    const channel = supabase
      .channel('user-presence-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `school_id=eq.${schoolId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new as {
              user_id: string
              status: string
              last_seen_at: string
            }

            setOnlineUsers((prev) => {
              const next = new Map(prev)
              const existing = next.get(record.user_id)
              next.set(record.user_id, {
                userId: record.user_id,
                full_name: existing?.full_name,
                status: record.status as 'online' | 'away' | 'offline',
                last_seen_at: record.last_seen_at,
              })
              return next
            })
          } else if (payload.eventType === 'DELETE') {
            const record = payload.old as { user_id: string }
            setOnlineUsers((prev) => {
              const next = new Map(prev)
              next.delete(record.user_id)
              return next
            })
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        }
      })

    // Heartbeat - update presence every 30 seconds
    heartbeatRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updatePresence('online')
      }
    }, HEARTBEAT_INTERVAL_MS)

    // Handle visibility change
    const handleVisibilityChange = () => {
      const newStatus = document.visibilityState === 'visible' ? 'online' : 'away'
      updatePresence(newStatus)
    }

    // Handle before unload - mark as offline
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable delivery on page close
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (supabaseUrl && supabaseKey) {
        navigator.sendBeacon(
          `${supabaseUrl}/rest/v1/user_presence?user_id=eq.${userId}`,
          JSON.stringify({ status: 'offline', last_seen_at: new Date().toISOString() })
        )
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Periodically clean up stale users from local state
    const cleanupInterval = setInterval(() => {
      setOnlineUsers((prev) => {
        const next = new Map(prev)
        const threshold = Date.now() - ONLINE_THRESHOLD_MS

        next.forEach((user, key) => {
          const lastSeen = new Date(user.last_seen_at).getTime()
          if (lastSeen < threshold) {
            next.delete(key)
          }
        })

        return next
      })
    }, 60000) // Clean up every minute

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)

      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
      }
      clearInterval(cleanupInterval)

      supabase.removeChannel(channel)

      // Mark as offline on unmount
      updatePresence('away')
      setIsConnected(false)
    }
  }, [schoolId, userId, updatePresence, fetchOnlineUsers])

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
