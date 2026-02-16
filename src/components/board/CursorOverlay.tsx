import { Group, Line, Text, Rect } from 'react-konva'
import type { PresenceUser } from '@/hooks/usePresence'

interface CursorOverlayProps {
  users: PresenceUser[]
  stagePos: { x: number; y: number }
  stageScale: number
}

function CursorArrow({ user }: { user: PresenceUser }) {
  if (!user.cursor) return null

  const { x, y } = user.cursor

  return (
    <Group x={x} y={y}>
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

export function CursorOverlay({ users, stagePos, stageScale }: CursorOverlayProps) {
  // Transform cursors from canvas coordinates to screen coordinates
  // Cursors are stored in canvas (world) coordinates, render directly
  const visibleUsers = users.filter((u) => u.cursor !== null)

  if (visibleUsers.length === 0) return null

  return (
    <Group
      x={-stagePos.x / stageScale}
      y={-stagePos.y / stageScale}
      scaleX={1 / stageScale}
      scaleY={1 / stageScale}
      listening={false}
    >
      {visibleUsers.map((user) => (
        <CursorArrow key={user.userId} user={user} />
      ))}
    </Group>
  )
}
