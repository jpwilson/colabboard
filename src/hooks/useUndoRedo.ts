import { useRef, useCallback, useState } from 'react'

const MAX_HISTORY = 50

export type UndoAction =
  | { type: 'create'; objectId: string; objectSnapshot: unknown }
  | { type: 'delete'; objectId: string; objectSnapshot: unknown }
  | { type: 'update'; objectId: string; before: Record<string, unknown>; after: Record<string, unknown> }
  | { type: 'batch'; entries: UndoAction[] }

interface UseUndoRedoReturn {
  pushAction: (action: UndoAction) => void
  undo: () => UndoAction | null
  redo: () => UndoAction | null
  canUndo: boolean
  canRedo: boolean
}

export function useUndoRedo(): UseUndoRedoReturn {
  const undoStackRef = useRef<UndoAction[]>([])
  const redoStackRef = useRef<UndoAction[]>([])
  // Track stack sizes as state so canUndo/canRedo update the UI
  const [undoLen, setUndoLen] = useState(0)
  const [redoLen, setRedoLen] = useState(0)

  const pushAction = useCallback(
    (action: UndoAction) => {
      undoStackRef.current.push(action)
      if (undoStackRef.current.length > MAX_HISTORY) {
        undoStackRef.current.shift()
      }
      redoStackRef.current = []
      setUndoLen(undoStackRef.current.length)
      setRedoLen(0)
    },
    [],
  )

  const undo = useCallback((): UndoAction | null => {
    const action = undoStackRef.current.pop() || null
    if (action) {
      redoStackRef.current.push(action)
      setUndoLen(undoStackRef.current.length)
      setRedoLen(redoStackRef.current.length)
    }
    return action
  }, [])

  const redo = useCallback((): UndoAction | null => {
    const action = redoStackRef.current.pop() || null
    if (action) {
      undoStackRef.current.push(action)
      setUndoLen(undoStackRef.current.length)
      setRedoLen(redoStackRef.current.length)
    }
    return action
  }, [])

  return {
    pushAction,
    undo,
    redo,
    canUndo: undoLen > 0,
    canRedo: redoLen > 0,
  }
}
