'use client'

import { useState, useRef } from 'react'

interface BoardCardProps {
  board: {
    id: string
    slug: string
    name: string
    owner_id: string
    updated_at: string
  }
  memberCount: number
  isOwner: boolean
  renameAction: (boardId: string, formData: FormData) => Promise<void>
  deleteAction: (boardId: string) => Promise<void>
}

export function BoardCard({ board, memberCount, isOwner, renameAction, deleteAction }: BoardCardProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(board.name)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmitRename = async () => {
    setEditing(false)
    if (name.trim() && name.trim() !== board.name) {
      const fd = new FormData()
      fd.set('name', name.trim())
      await renameAction(board.id, fd)
    } else {
      setName(board.name)
    }
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/30 bg-white/50 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl">
      {/* Board preview strip */}
      <div className="mb-4 h-2 w-full rounded-full bg-gradient-to-r from-primary-light via-accent to-teal opacity-60" />

      <a href={`/board/${board.slug}`} className="block">
        {editing ? null : (
          <h3 className="text-base font-semibold text-slate-800 transition group-hover:text-primary">
            {name}
          </h3>
        )}
      </a>

      {/* Inline rename */}
      {editing && (
        <input
          ref={inputRef}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSubmitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              setName(board.name)
              setEditing(false)
            }
          }}
          className="w-full rounded-lg border border-primary/40 bg-white px-2 py-1 text-base font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-primary/20"
        />
      )}

      <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
        <span>
          {new Date(board.updated_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
        {memberCount > 1 && <span>{memberCount} members</span>}
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
          isOwner
            ? 'bg-primary/10 text-primary'
            : 'bg-accent/20 text-accent-dark'
        }`}>
          {isOwner ? 'Owner' : 'Shared'}
        </span>
      </div>

      {/* Action buttons — show on hover */}
      {isOwner && (
        <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.preventDefault()
              setEditing(true)
              setTimeout(() => inputRef.current?.focus(), 0)
            }}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-primary/10 hover:text-primary"
            title="Rename board"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
            </svg>
          </button>
          <form action={deleteAction.bind(null, board.id)}>
            <button
              type="submit"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
              title="Delete board"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
