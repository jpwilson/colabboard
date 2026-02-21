'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Member {
  user_id: string
  role: string
  status: string
  display_name: string | null
}

interface ShareModalProps {
  boardId: string
  boardSlug: string
  isOwner: boolean
  onClose: () => void
}

export function ShareModal({ boardId, boardSlug, isOwner, onClose }: ShareModalProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [linkCopied, setLinkCopied] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [inviteStatus, setInviteStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    async function fetchMembers() {
      const supabase = createClient()
      const { data } = await supabase
        .from('board_members')
        .select('user_id, role, status')
        .eq('board_id', boardId)

      if (data) {
        // Fetch display names
        const userIds = data.map((m) => m.user_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', userIds)

        const profileMap = new Map((profiles || []).map((p) => [p.id, p.display_name]))

        setMembers(
          data.map((m) => ({
            ...m,
            display_name: profileMap.get(m.user_id) || null,
          })),
        )
      }
      setLoading(false)
    }
    fetchMembers()
  }, [boardId])

  const copyLink = () => {
    const url = `${window.location.origin}/board/${boardSlug}/join`
    navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteStatus(null)

    try {
      const res = await fetch(`/api/boards/${boardId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), message: inviteMessage.trim() || undefined }),
      })
      const data = await res.json()

      if (res.ok) {
        setInviteStatus({ type: 'success', text: data.message || 'Invitation sent!' })
        setInviteEmail('')
        setInviteMessage('')
        // Refresh member list
        const supabase = createClient()
        const { data: updated } = await supabase
          .from('board_members')
          .select('user_id, role, status')
          .eq('board_id', boardId)
        if (updated) {
          const userIds = updated.map((m) => m.user_id)
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', userIds)
          const profileMap = new Map((profiles || []).map((p) => [p.id, p.display_name]))
          setMembers(updated.map((m) => ({ ...m, display_name: profileMap.get(m.user_id) || null })))
        }
      } else {
        setInviteStatus({ type: 'error', text: data.error || 'Failed to invite' })
      }
    } catch {
      setInviteStatus({ type: 'error', text: 'Network error' })
    } finally {
      setInviting(false)
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">Accepted</span>
      case 'pending':
        return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Pending</span>
      case 'declined':
        return <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">Declined</span>
      default:
        return null
    }
  }

  const roleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">Owner</span>
      case 'editor':
        return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">Editor</span>
      case 'viewer':
        return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Viewer</span>
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-md rounded-2xl border border-white/30 bg-white/90 p-6 shadow-2xl backdrop-blur-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Share Board</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Copy link */}
        <div className="mt-4">
          <button
            onClick={copyLink}
            className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <svg className="mr-2 inline h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.06a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.374" />
            </svg>
            {linkCopied ? 'Link copied!' : 'Copy invite link'}
          </button>
        </div>

        {/* Invite by email (owner only) */}
        {isOwner && (
          <form onSubmit={handleInvite} className="mt-4 space-y-2">
            <input
              type="email"
              placeholder="Invite by email..."
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
              required
            />
            <input
              type="text"
              placeholder="Add a message (optional)"
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            />
            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-md transition hover:shadow-lg disabled:opacity-50"
            >
              {inviting ? 'Sending...' : 'Send Invitation'}
            </button>
            {inviteStatus && (
              <p className={`text-xs ${inviteStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {inviteStatus.text}
              </p>
            )}
          </form>
        )}

        {/* Member list */}
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Members</h3>
          {loading ? (
            <p className="mt-2 text-sm text-slate-400">Loading...</p>
          ) : (
            <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
              {members.map((m) => (
                <div key={m.user_id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50">
                  <span className="text-sm text-slate-700">{m.display_name || 'Anonymous'}</span>
                  <div className="flex items-center gap-1.5">
                    {roleBadge(m.role)}
                    {statusBadge(m.status)}
                  </div>
                </div>
              ))}
              {members.length === 0 && (
                <p className="py-2 text-sm text-slate-400">No members yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
