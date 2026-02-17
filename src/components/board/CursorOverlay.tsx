import { useState, useRef, useEffect } from 'react'
import { Group, Line, Text, Rect } from 'react-konva'
import type { PresenceUser } from '@/hooks/usePresence'
import type Konva from 'konva'

interface CursorOverlayProps {
  users: PresenceUser[]
  stageScale: number
}

const LERP_FACTOR = 0.2 // Smoothing: 0 = no movement, 1 = instant snap

function CursorArrow({ user, inverseScale }: { user: PresenceUser; inverseScale: number }) {
  const groupRef = useRef<Konva.Group>(null)
  const targetRef = useRef({ x: 0, y: 0 })
  const currentPosRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef<number>(0)

  // Capture initial position once (stable across re-renders)
  const [initPos] = useState(() => ({
    x: user.cursor?.x ?? 0,
    y: user.cursor?.y ?? 0,
  }))

  // Push new cursor targets into the ref (effect — not during render)
  useEffect(() => {
    if (user.cursor) {
      targetRef.current = { x: user.cursor.x, y: user.cursor.y }
    }
  }, [user.cursor])

  // Animation loop — runs once, lerps currentPos toward target
  useEffect(() => {
    let running = true
    currentPosRef.current = { ...initPos }
    targetRef.current = { ...initPos }

    const animate = () => {
      if (!running || !groupRef.current) return

      const cur = currentPosRef.current
      const target = targetRef.current
      const dx = target.x - cur.x
      const dy = target.y - cur.y

      if (Math.abs(dx) >= 0.5 || Math.abs(dy) >= 0.5) {
        cur.x += dx * LERP_FACTOR
        cur.y += dy * LERP_FACTOR
      } else {
        cur.x = target.x
        cur.y = target.y
      }

      groupRef.current.x(cur.x)
      groupRef.current.y(cur.y)
      groupRef.current.getLayer()?.batchDraw()

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      running = false
      cancelAnimationFrame(rafRef.current)
    }
  }, [initPos])

  if (!user.cursor) return null

  return (
    <Group
      ref={groupRef}
      x={initPos.x}
      y={initPos.y}
      scaleX={inverseScale}
      scaleY={inverseScale}
    >
      {/* Arrow cursor */}
      <Line
        points={[0, 0, 4, 14, 8, 10, 16, 16, 18, 14, 10, 8, 14, 4]}
        fill={user.color}
        stroke="white"
        strokeWidth={1}
        closed
        listening={false}
      />
      {/* Name label */}
      <Group x={16} y={18}>
        <Rect
          width={Math.max(user.userName.length * 7 + 12, 40)}
          height={20}
          fill={user.color}
          cornerRadius={4}
          listening={false}
        />
        <Text
          x={6}
          y={3}
          text={user.userName}
          fontSize={12}
          fontFamily="sans-serif"
          fill="white"
          listening={false}
        />
      </Group>
    </Group>
  )
}

export function CursorOverlay({ users, stageScale }: CursorOverlayProps) {
  // Cursors are in world coordinates (same space as objects).
  // Render directly — the Stage transform handles pan/zoom.
  // Counter-scale arrow/label so they stay the same visual size.
  const visibleUsers = users.filter((u) => u.cursor !== null)

  if (visibleUsers.length === 0) return null

  const inverseScale = 1 / stageScale

  return (
    <Group listening={false}>
      {visibleUsers.map((user) => (
        <CursorArrow key={user.userId} user={user} inverseScale={inverseScale} />
      ))}
    </Group>
  )
}
