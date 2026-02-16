'use client'

import type { PresenceUser } from '@/hooks/usePresence'

interface PresenceIndicatorProps {
  users: PresenceUser[]
  currentUserName: string
}

export function PresenceIndicator({ users, currentUserName }: PresenceIndicatorProps) {
  const allUsers = [{ name: currentUserName, color: '#6b7280', isYou: true }].concat(
    users.map((u) => ({ name: u.userName, color: u.color, isYou: false })),
  )

  return (
    <div className="flex items-center gap-1">
      {allUsers.map((user, i) => (
        <div
          key={user.isYou ? 'you' : i}
          className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: user.color }}
          title={user.isYou ? `${user.name} (you)` : user.name}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {allUsers.length > 1 && (
        <span className="ml-1 text-xs text-gray-400">{allUsers.length} online</span>
      )}
    </div>
  )
}
