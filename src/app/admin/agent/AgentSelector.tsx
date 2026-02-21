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
    name: 'Vercel AI SDK',
    description:
      'Inline agent using Vercel AI SDK + Anthropic. Runs within the Next.js app. Zero additional infrastructure.',
    tech: 'Vercel AI SDK v6 + Claude + Langfuse',
  },
  {
    id: 'docker',
    name: 'Docker (Python)',
    description:
      'External agent service using LangChain + FastAPI. Runs as a separate Docker container.',
    tech: 'FastAPI + LangChain + ChatAnthropic + Langfuse',
  },
]

const MODELS: Array<{
  id: string
  name: string
  description: string
}> = [
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    description: 'Best balance of speed, intelligence, and cost',
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    description: 'Fastest and most affordable, good for simple tasks',
  },
]

export function AgentSelector({
  currentBackend,
  currentModel,
}: {
  currentBackend: AgentBackend
  currentModel: string
}) {
  const [selectedBackend, setSelectedBackend] = useState(currentBackend)
  const [selectedModel, setSelectedModel] = useState(currentModel)
  const [status, setStatus] = useState<Record<AgentBackend, boolean | null>>({
    nextjs: null,
    docker: null,
  })
  const [checking, setChecking] = useState<Record<AgentBackend, boolean>>({
    nextjs: false,
    docker: false,
  })
  const [saving, startSaving] = useTransition()
  const [saved, setSaved] = useState(false)

  const hasChanges =
    selectedBackend !== currentBackend || selectedModel !== currentModel

  const checkHealth = async (backend: AgentBackend) => {
    setChecking((prev) => ({ ...prev, [backend]: true }))
    setStatus((prev) => ({ ...prev, [backend]: null }))
    try {
      const res = await fetch(`/api/admin/agent/health?backend=${backend}`)
      const data = await res.json()
      setStatus((prev) => ({ ...prev, [backend]: data.healthy }))
    } catch {
      setStatus((prev) => ({ ...prev, [backend]: false }))
    } finally {
      setChecking((prev) => ({ ...prev, [backend]: false }))
    }
  }

  const handleSave = () => {
    startSaving(async () => {
      const res = await fetch('/api/admin/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backend: selectedBackend, model: selectedModel }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Backend Selection */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Agent Backend
        </h2>
        <div className="space-y-4">
          {BACKENDS.map((backend) => (
            <div
              key={backend.id}
              onClick={() => setSelectedBackend(backend.id)}
              className={`cursor-pointer rounded-xl border-2 p-6 transition ${
                selectedBackend === backend.id
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
                    disabled={checking[backend.id]}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    {checking[backend.id] ? 'Checking...' : 'Check Health'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Model Selection */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          AI Model
        </h2>
        <div className="space-y-3">
          {MODELS.map((model) => (
            <div
              key={model.id}
              onClick={() => setSelectedModel(model.id)}
              className={`cursor-pointer rounded-lg border-2 px-5 py-4 transition ${
                selectedModel === model.id
                  ? 'border-primary bg-blue-50/50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-800">
                  {model.name}
                </h3>
                {currentModel === model.id && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Active
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {model.description}
              </p>
              <p className="mt-1 font-mono text-xs text-slate-400">
                {model.id}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
        {saved && (
          <span className="text-sm text-green-600">
            Configuration saved successfully.
          </span>
        )}
        {hasChanges && !saved && (
          <span className="text-sm text-amber-600">Unsaved changes</span>
        )}
      </div>
    </div>
  )
}
