'use client'

import { useState, useTransition } from 'react'
import type { AgentBackend } from '@/types/board'

const BACKENDS: Array<{
  id: AgentBackend
  name: string
  description: string
  tech: string
}> = [
  {
    id: 'nextjs',
    name: 'Next.js SDK',
    description:
      'Inline agent using Vercel AI SDK + Anthropic. Runs within the Next.js app. Zero additional infrastructure.',
    tech: 'Vercel AI SDK v6 + Claude Sonnet 4.5 + Langfuse',
  },
  {
    id: 'docker',
    name: 'Docker (Python)',
    description:
      'External agent service using LangChain + FastAPI. Runs as a separate Docker container.',
    tech: 'FastAPI + LangChain + ChatAnthropic + Langfuse',
  },
]

export function AgentSelector({
  currentBackend,
}: {
  currentBackend: AgentBackend
}) {
  const [selected, setSelected] = useState(currentBackend)
  const [status, setStatus] = useState<Record<AgentBackend, boolean | null>>({
    nextjs: null,
    docker: null,
  })
  const [saving, startSaving] = useTransition()
  const [saved, setSaved] = useState(false)

  const checkHealth = async (backend: AgentBackend) => {
    try {
      const res = await fetch(`/api/admin/agent/health?backend=${backend}`)
      const data = await res.json()
      setStatus((prev) => ({ ...prev, [backend]: data.healthy }))
    } catch {
      setStatus((prev) => ({ ...prev, [backend]: false }))
    }
  }

  const handleSave = () => {
    startSaving(async () => {
      const res = await fetch('/api/admin/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backend: selected }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  return (
    <div className="space-y-6">
      {BACKENDS.map((backend) => (
        <div
          key={backend.id}
          onClick={() => setSelected(backend.id)}
          className={`cursor-pointer rounded-xl border-2 p-6 transition ${
            selected === backend.id
              ? 'border-primary bg-blue-50/50'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-800">
                  {backend.name}
                </h3>
                {currentBackend === backend.id && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Active
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {backend.description}
              </p>
              <p className="mt-2 font-mono text-xs text-slate-400">
                {backend.tech}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {status[backend.id] !== null && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    status[backend.id]
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {status[backend.id] ? 'Healthy' : 'Unavailable'}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  checkHealth(backend.id)
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Check Health
              </button>
            </div>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || selected === currentBackend}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
        {saved && (
          <span className="text-sm text-green-600">
            Saved! Agent backend updated.
          </span>
        )}
        {selected !== currentBackend && (
          <span className="text-sm text-amber-600">Unsaved changes</span>
        )}
      </div>
    </div>
  )
}
