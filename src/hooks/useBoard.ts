'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import {
  boardObjectToCanvas,
  canvasToData,
  lwwMerge,
  type BoardObject,
  type BroadcastPayload,
  type CanvasObject,
} from '@/lib/board-sync'

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected'

interface UseBoardOptions {
  boardId: string
  userId: string
}

export function useBoard({ boardId, userId }: UseBoardOptions) {
  const [objects, setObjects] = useState<CanvasObject[]>([])
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected')
  const objectsRef = useRef<Map<string, CanvasObject>>(new Map())
  const channelRef = useRef<RealtimeChannel | null>(null)
  const hasSubscribedRef = useRef(false)

  // Sync objectsRef with state
  const syncState = useCallback(() => {
    const sorted = Array.from(objectsRef.current.values()).sort(
      (a, b) => a.z_index - b.z_index,
    )
    setObjects(sorted)
  }, [])

  // Reusable fetch function — called on initial load and reconnect
  const fetchObjects = useCallback(async () => {
    if (!boardId) return
    const supabase = createClient()
    const { data, error } = await supabase
      .from('board_objects')
      .select('*')
      .eq('board_id', boardId)
      .order('z_index', { ascending: true })

    if (error) {
      console.error('Failed to fetch board objects:', error)
      return
    }

    const map = new Map<string, CanvasObject>()
    for (const obj of data || []) {
      map.set(obj.id, boardObjectToCanvas(obj as BoardObject))
    }
    objectsRef.current = map
    syncState()
  }, [boardId, syncState])

  // Fetch initial objects
  useEffect(() => {
    if (!boardId) return
    fetchObjects().then(() => setLoading(false))
  }, [boardId, fetchObjects])

  // Subscribe to broadcast + postgres changes
  useEffect(() => {
    if (!boardId) return

    const supabase = createClient()
    const channel = supabase.channel(`board-objects:${boardId}`)

    channelRef.current = channel

    // Broadcast: instant optimistic updates between clients
    channel.on('broadcast', { event: 'object-change' }, ({ payload }) => {
      const msg = payload as BroadcastPayload
      if (msg.type === 'create' || msg.type === 'update') {
        lwwMerge(objectsRef.current, msg.object)
        syncState()
      } else if (msg.type === 'delete') {
        objectsRef.current.delete(msg.id)
        syncState()
      }
    })

    // Postgres changes: catch-up for missed broadcasts
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'board_objects',
        filter: `board_id=eq.${boardId}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          lwwMerge(objectsRef.current, payload.new as BoardObject)
          syncState()
        } else if (payload.eventType === 'DELETE') {
          const old = payload.old as { id?: string }
          if (old.id) {
            objectsRef.current.delete(old.id)
            syncState()
          }
        }
      },
    )

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setConnectionStatus('connected')
        // On reconnect, re-fetch to catch any missed changes
        if (hasSubscribedRef.current) {
          fetchObjects()
        }
        hasSubscribedRef.current = true
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setConnectionStatus('reconnecting')
      } else if (status === 'CLOSED') {
        setConnectionStatus('disconnected')
      }
    })

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
      hasSubscribedRef.current = false
    }
  }, [boardId, syncState, fetchObjects])

  // navigator.onLine supplementary signal
  useEffect(() => {
    function handleOffline() {
      setConnectionStatus('disconnected')
    }
    function handleOnline() {
      setConnectionStatus('reconnecting')
      // Re-fetch to recover any missed changes
      fetchObjects()
    }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [fetchObjects])

  const broadcast = useCallback(
    (payload: BroadcastPayload) => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'object-change',
        payload,
      })
    },
    [],
  )

  const addObject = useCallback(
    async (obj: CanvasObject) => {
      // Optimistic local update
      objectsRef.current.set(obj.id, obj)
      syncState()

      const boardObj: BoardObject = {
        id: obj.id,
        board_id: boardId,
        type: obj.type,
        data: canvasToData(obj) as unknown as typeof boardObj.data,
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
        z_index: obj.z_index,
        created_by: userId,
        updated_at: obj.updated_at,
      }

      // Persist to database first, then broadcast
      const supabase = createClient()
      const { error } = await supabase.from('board_objects').insert(boardObj)
      if (error) {
        console.error('Failed to create object:', error)
        objectsRef.current.delete(obj.id)
        syncState()
        return
      }
      broadcast({ type: 'create', object: boardObj })
    },
    [boardId, userId, syncState, broadcast],
  )

  const updateObject = useCallback(
    async (id: string, updates: Partial<CanvasObject>) => {
      const previous = objectsRef.current.get(id)
      if (!previous) return

      const updated: CanvasObject = {
        ...previous,
        ...updates,
        updated_at: new Date().toISOString(),
      }
      objectsRef.current.set(id, updated)
      syncState()

      const boardObj: BoardObject = {
        id: updated.id,
        board_id: boardId,
        type: updated.type,
        data: canvasToData(updated) as unknown as typeof boardObj.data,
        x: updated.x,
        y: updated.y,
        width: updated.width,
        height: updated.height,
        z_index: updated.z_index,
        created_by: previous.updated_at ? userId : null,
        updated_at: updated.updated_at,
      }

      // Persist to database first, then broadcast
      const supabase = createClient()
      const { error } = await supabase
        .from('board_objects')
        .update({
          type: updated.type,
          data: canvasToData(updated) as unknown as Record<string, unknown>,
          x: updated.x,
          y: updated.y,
          width: updated.width,
          height: updated.height,
          z_index: updated.z_index,
          updated_at: updated.updated_at,
        })
        .eq('id', id)
        .eq('board_id', boardId)
      if (error) {
        console.error('Failed to update object:', error)
        objectsRef.current.set(id, previous)
        syncState()
        return
      }
      broadcast({ type: 'update', object: boardObj })
    },
    [boardId, userId, syncState, broadcast],
  )

  const deleteObject = useCallback(
    async (id: string) => {
      const previous = objectsRef.current.get(id)
      objectsRef.current.delete(id)
      syncState()

      // Persist to database first, then broadcast
      const supabase = createClient()
      const { error } = await supabase
        .from('board_objects')
        .delete()
        .eq('id', id)
        .eq('board_id', boardId)
      if (error) {
        console.error('Failed to delete object:', error)
        if (previous) {
          objectsRef.current.set(id, previous)
          syncState()
        }
        return
      }
      broadcast({ type: 'delete', id })
    },
    [boardId, syncState, broadcast],
  )

  return { objects, loading, connectionStatus, addObject, updateObject, deleteObject }
}
