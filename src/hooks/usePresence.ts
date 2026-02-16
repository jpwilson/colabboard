'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useThrottle } from './useThrottle'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface CursorPosition {
  x: number
  y: number
}

export interface PresenceUser {
  userId: string
  userName: string
  cursor: CursorPosition | null
  color: string
}

const CURSOR_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
]

function getUserColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i)
    hash |= 0
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length]
}

interface UsePresenceOptions {
  boardId: string
  userId: string
  userName: string
}

export function usePresence({ boardId, userId, userName }: UsePresenceOptions) {
  const [others, setOthers] = useState<PresenceUser[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!boardId || !userId) return

    const supabase = createClient()
    const channel = supabase.channel(`board:${boardId}`, {
      config: {
        presence: { key: userId },
      },
    })

    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users: PresenceUser[] = []

        for (const [key, presences] of Object.entries(state)) {
          if (key === userId) continue
          const latest = presences[presences.length - 1] as {
            userId?: string
            userName?: string
            cursor?: CursorPosition | null
          }
          if (latest) {
            users.push({
              userId: key,
              userName: (latest.userName as string) || 'Anonymous',
              cursor: (latest.cursor as CursorPosition | null) || null,
              color: getUserColor(key),
            })
          }
        }

        setOthers(users)
      })
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return
        await channel.track({
          userId,
          userName,
          cursor: null,
        })
      })

    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [boardId, userId, userName])

  const updateCursor = useThrottle(
    useCallback(
      (cursor: CursorPosition | null) => {
        if (!channelRef.current) return
        channelRef.current.track({
          userId,
          userName,
          cursor,
        })
      },
      [userId, userName],
    ),
    50,
  )

  return { others, updateCursor }
}
