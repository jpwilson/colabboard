'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface UseDraggableOptions {
  /** localStorage key to persist position (null = no persistence) */
  storageKey: string | null
  /** Initial position before any user drag or storage recall */
  defaultPosition: { x: number; y: number }
  /** If true, clamp to viewport on every resize (default: true) */
  clampToViewport?: boolean
  /** Approximate element dimensions for clamping (default: 320x400) */
  elementSize?: { width: number; height: number }
}

interface UseDraggableReturn {
  position: { x: number; y: number }
  dragHandleProps: {
    onMouseDown: (e: React.MouseEvent) => void
    style: React.CSSProperties
  }
  setPosition: (pos: { x: number; y: number }) => void
  isDragging: boolean
}

function clamp(pos: { x: number; y: number }, elW: number, elH: number): { x: number; y: number } {
  const maxX = window.innerWidth - elW - 10
  const maxY = window.innerHeight - elH - 10
  return {
    x: Math.max(10, Math.min(maxX, pos.x)),
    y: Math.max(10, Math.min(maxY, pos.y)),
  }
}

function readStorage(key: string | null): { x: number; y: number } | null {
  if (!key) return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') return parsed
  } catch {
    // ignore
  }
  return null
}

export function useDraggable(options: UseDraggableOptions): UseDraggableReturn {
  const { storageKey, defaultPosition, clampToViewport = true, elementSize = { width: 320, height: 400 } } = options

  const [position, setPositionState] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return defaultPosition
    const stored = readStorage(storageKey)
    const initial = stored || defaultPosition
    return clampToViewport ? clamp(initial, elementSize.width, elementSize.height) : initial
  })

  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const posRef = useRef(position)

  // Keep posRef in sync via effect (React 19 lint: no ref updates during render)
  useEffect(() => {
    posRef.current = position
  }, [position])

  const setPosition = useCallback(
    (pos: { x: number; y: number }) => {
      const clamped = clampToViewport ? clamp(pos, elementSize.width, elementSize.height) : pos
      setPositionState(clamped)
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(clamped))
        } catch {
          // ignore
        }
      }
    },
    [clampToViewport, elementSize.width, elementSize.height, storageKey],
  )

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only left button
      if (e.button !== 0) return
      e.preventDefault()
      setIsDragging(true)
      dragOffset.current = {
        x: e.clientX - posRef.current.x,
        y: e.clientY - posRef.current.y,
      }

      const handleMouseMove = (ev: MouseEvent) => {
        const newPos = {
          x: ev.clientX - dragOffset.current.x,
          y: ev.clientY - dragOffset.current.y,
        }
        const clamped = clampToViewport ? clamp(newPos, elementSize.width, elementSize.height) : newPos
        setPositionState(clamped)
        posRef.current = clamped
      }

      const handleMouseUp = () => {
        setIsDragging(false)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(posRef.current))
          } catch {
            // ignore
          }
        }
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [clampToViewport, elementSize.width, elementSize.height, storageKey],
  )

  // Re-clamp on window resize
  useEffect(() => {
    if (!clampToViewport) return
    const handleResize = () => {
      setPositionState((prev) => clamp(prev, elementSize.width, elementSize.height))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [clampToViewport, elementSize.width, elementSize.height])

  return {
    position,
    dragHandleProps: {
      onMouseDown,
      style: {
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none' as const,
      },
    },
    setPosition,
    isDragging,
  }
}
