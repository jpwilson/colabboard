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
  const cursorBufferRef = useRef<Map<string, CursorPosition | null>>(new Map())

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
          }
          if (latest) {
            // Apply any buffered cursor position
            const bufferedCursor = cursorBufferRef.current.get(key) ?? null
            users.push({
              userId: key,
              userName: (latest.userName as string) || 'Anonymous',
              cursor: bufferedCursor,
              color: getUserColor(key),
            })
          }
        }

        setOthers(users)
      })
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        const { userId: senderId, cursor } = payload as {
          userId: string
          cursor: CursorPosition | null
        }
        if (senderId === userId) return

        // Buffer cursor position for presence sync edge case
        cursorBufferRef.current.set(senderId, cursor)

        // Fast-path: update cursor directly in state
        setOthers((prev) => {
          const idx = prev.findIndex((u) => u.userId === senderId)
          if (idx === -1) return prev // User not in presence yet, buffered for later
          const updated = [...prev]
          updated[idx] = { ...updated[idx], cursor }
          return updated
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track presence (initial subscribe or reconnect re-track)
          await channel.track({
            userId,
            userName,
          })
        }
      })

    const buffer = cursorBufferRef.current
    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
      channelRef.current = null
      buffer.clear()
    }
  }, [boardId, userId, userName])

  const updateCursor = useThrottle(
    useCallback(
      (cursor: CursorPosition | null) => {
        if (!channelRef.current) return
        channelRef.current.send({
          type: 'broadcast',
          event: 'cursor',
          payload: { userId, cursor },
        })
      },
      [userId],
    ),
    16,
  )

  return { others, updateCursor }
}
