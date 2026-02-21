'use client'

import { useState } from 'react'

interface InvitationCardProps {
  boardId: string
  boardName: string
  inviterName: string | null
  message: string | null
  invitedAt: string
  acceptAction: (boardId: string) => Promise<void>
  declineAction: (boardId: string) => Promise<void>
}

export function InvitationCard({
  boardId,
  boardName,
  inviterName,
  message,
  invitedAt,
  acceptAction,
  declineAction,
}: InvitationCardProps) {
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null)

  const handleAccept = async () => {
    setLoading('accept')
    await acceptAction(boardId)
  }

  const handleDecline = async () => {
    setLoading('decline')
    await declineAction(boardId)
  }

  const timeAgo = getTimeAgo(invitedAt)

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/30 border-l-4 border-l-amber-400 bg-white/50 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-slate-800">{boardName}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {inviterName ? `Invited by ${inviterName}` : 'You were invited to collaborate'}
          </p>
          {message && (
            <p className="mt-2 rounded-lg bg-amber-50/60 px-3 py-2 text-xs text-amber-800 italic">
              &ldquo;{message}&rdquo;
            </p>
          )}
          <p className="mt-2 text-[11px] text-slate-400">{timeAgo}</p>
        </div>

        <span className="ml-3 flex-shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-700">
          Pending
        </span>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleDecline}
          disabled={loading !== null}
          className="flex-1 rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
        >
          {loading === 'decline' ? 'Declining...' : 'Decline'}
        </button>
        <button
          onClick={handleAccept}
          disabled={loading !== null}
          className="flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-slate-800 shadow-md transition hover:shadow-lg disabled:opacity-50"
        >
          {loading === 'accept' ? 'Accepting...' : 'Accept'}
        </button>
      </div>
    </div>
  )
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
