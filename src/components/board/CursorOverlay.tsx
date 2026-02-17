import { Group, Line, Text, Rect } from 'react-konva'
import type { PresenceUser } from '@/hooks/usePresence'

interface CursorOverlayProps {
  users: PresenceUser[]
  stageScale: number
}

function CursorArrow({ user, inverseScale }: { user: PresenceUser; inverseScale: number }) {
  if (!user.cursor) return null

  const { x, y } = user.cursor

  return (
    <Group x={x} y={y} scaleX={inverseScale} scaleY={inverseScale}>
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
