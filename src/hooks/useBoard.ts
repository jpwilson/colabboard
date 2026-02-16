'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import {
  boardObjectToCanvas,
  lwwMerge,
  type BoardObject,
  type BroadcastPayload,
  type CanvasObject,
} from '@/lib/board-sync'

interface UseBoardOptions {
  boardId: string
  userId: string
}

export function useBoard({ boardId, userId }: UseBoardOptions) {
  const [objects, setObjects] = useState<CanvasObject[]>([])
  const [loading, setLoading] = useState(true)
  const objectsRef = useRef<Map<string, CanvasObject>>(new Map())
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Sync objectsRef with state
  const syncState = useCallback(() => {
    const sorted = Array.from(objectsRef.current.values()).sort(
      (a, b) => a.z_index - b.z_index,
    )
    setObjects(sorted)
  }, [])

  // Fetch initial objects
  useEffect(() => {
    if (!boardId) return

    const supabase = createClient()

    async function fetchObjects() {
      const { data, error } = await supabase
        .from('board_objects')
        .select('*')
        .eq('board_id', boardId)
        .order('z_index', { ascending: true })

      if (error) {
        console.error('Failed to fetch board objects:', error)
        setLoading(false)
        return
      }

      const map = new Map<string, CanvasObject>()
      for (const obj of data || []) {
        map.set(obj.id, boardObjectToCanvas(obj as BoardObject))
      }
      objectsRef.current = map
      syncState()
      setLoading(false)
    }

    fetchObjects()
  }, [boardId, syncState])

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

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [boardId, syncState])

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
        data: { fill: obj.fill, text: obj.text || '' },
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
        z_index: obj.z_index,
        created_by: userId,
        updated_at: obj.updated_at,
      }

      // Broadcast to other clients
      broadcast({ type: 'create', object: boardObj })

      // Persist to database
      const supabase = createClient()
      const { error } = await supabase.from('board_objects').insert(boardObj)
      if (error) console.error('Failed to create object:', error)
    },
    [boardId, userId, syncState, broadcast],
  )

  const updateObject = useCallback(
    async (id: string, updates: Partial<CanvasObject>) => {
      const existing = objectsRef.current.get(id)
      if (!existing) return

      const updated: CanvasObject = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString(),
      }
      objectsRef.current.set(id, updated)
      syncState()

      const boardObj: BoardObject = {
        id: updated.id,
        board_id: boardId,
        type: updated.type,
        data: { fill: updated.fill, text: updated.text || '' },
        x: updated.x,
        y: updated.y,
        width: updated.width,
        height: updated.height,
        z_index: updated.z_index,
        created_by: existing.updated_at ? userId : null,
        updated_at: updated.updated_at,
      }

      broadcast({ type: 'update', object: boardObj })

      const supabase = createClient()
      const { error } = await supabase
        .from('board_objects')
        .update({
          type: updated.type,
          data: { fill: updated.fill, text: updated.text || '' } as unknown as Record<string, unknown>,
          x: updated.x,
          y: updated.y,
          width: updated.width,
          height: updated.height,
          z_index: updated.z_index,
          updated_at: updated.updated_at,
        })
        .eq('id', id)
        .eq('board_id', boardId)
      if (error) console.error('Failed to update object:', error)
    },
    [boardId, userId, syncState, broadcast],
  )

  const deleteObject = useCallback(
    async (id: string) => {
      objectsRef.current.delete(id)
      syncState()

      broadcast({ type: 'delete', id })

      const supabase = createClient()
      const { error } = await supabase
        .from('board_objects')
        .delete()
        .eq('id', id)
        .eq('board_id', boardId)
      if (error) console.error('Failed to delete object:', error)
    },
    [boardId, syncState, broadcast],
  )

  return { objects, loading, addObject, updateObject, deleteObject }
}
