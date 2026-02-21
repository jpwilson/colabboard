'use client'

import { useState } from 'react'
import { SuperuserToggle } from '@/components/admin/SuperuserToggle'

export interface UserRow {
  id: string
  displayName: string
  email: string | null
  lastSignInAt: string | null
  isSuperuser: boolean
  boardsOwned: number
  boardsMember: number
  toggleDisabled: boolean
}

type SortKey = 'user' | 'email' | 'boardsOwned' | 'boardsJoined' | 'lastActive'
type SortDir = 'asc' | 'desc'

const COLUMNS: { key: SortKey; label: string; align: 'left' | 'center' }[] = [
  { key: 'user', label: 'User', align: 'left' },
  { key: 'email', label: 'Email', align: 'left' },
  { key: 'boardsOwned', label: 'Boards Owned', align: 'center' },
  { key: 'boardsJoined', label: 'Boards Joined', align: 'center' },
]

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg
      className={`ml-1 inline h-3 w-3 transition ${active ? 'text-slate-700' : 'text-slate-300'}`}
      viewBox="0 0 12 12"
      fill="currentColor"
    >
      {dir === 'asc' ? (
        <path d="M6 2L10 8H2L6 2Z" />
      ) : (
        <path d="M6 10L2 4H10L6 10Z" />
      )}
    </svg>
  )
}

export function SortableUsersTable({ users }: { users: UserRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('lastActive')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'user' || key === 'email' ? 'asc' : 'desc')
    }
  }

  const sorted = [...users].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1

    switch (sortKey) {
      case 'user':
        return dir * a.displayName.localeCompare(b.displayName)
      case 'email':
        return dir * (a.email ?? '').localeCompare(b.email ?? '')
      case 'boardsOwned':
        return dir * (a.boardsOwned - b.boardsOwned)
      case 'boardsJoined':
        return dir * (a.boardsMember - b.boardsMember)
      case 'lastActive': {
        if (!a.lastSignInAt && !b.lastSignInAt) return 0
        if (!a.lastSignInAt) return 1
        if (!b.lastSignInAt) return -1
        return dir * (new Date(a.lastSignInAt).getTime() - new Date(b.lastSignInAt).getTime())
      }
      default:
        return 0
    }
  })

  const thBase = 'px-6 py-3 text-xs font-semibold tracking-wider uppercase select-none cursor-pointer transition hover:text-slate-700'

  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={`${thBase} ${col.align === 'center' ? 'text-center' : 'text-left'} text-slate-500`}
              >
                {col.label}
                <SortIcon active={sortKey === col.key} dir={sortKey === col.key ? sortDir : 'asc'} />
              </th>
            ))}
            <th className="px-6 py-3 text-center text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Superuser
            </th>
            <th
              onClick={() => handleSort('lastActive')}
              className={`${thBase} text-left text-slate-500`}
            >
              Last Active
              <SortIcon active={sortKey === 'lastActive'} dir={sortKey === 'lastActive' ? sortDir : 'desc'} />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((user) => (
            <tr key={user.id} className="transition hover:bg-slate-50">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-slate-800">
                    {user.displayName}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-slate-600">
                  {user.email || (
                    <span className="italic text-slate-400">No email</span>
                  )}
                </span>
              </td>
              <td className="px-6 py-4 text-center">
                <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {user.boardsOwned}
                </span>
              </td>
              <td className="px-6 py-4 text-center">
                <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                  {user.boardsMember}
                </span>
              </td>
              <td className="px-6 py-4 text-center">
                <SuperuserToggle
                  userId={user.id}
                  initialValue={user.isSuperuser}
                  disabled={user.toggleDisabled}
                />
              </td>
              <td className="px-6 py-4 text-sm text-slate-500">
                {user.lastSignInAt
                  ? new Date(user.lastSignInAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      timeZone: 'America/Chicago',
                    })
                  : 'Never'}
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                No users found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
