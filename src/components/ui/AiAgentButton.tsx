'use client'

import { useState } from 'react'

export function AiAgentButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Expanded panel */}
      {open && (
        <div className="fixed right-6 bottom-20 z-[9999] w-80 rounded-2xl border border-white/30 bg-white/90 p-6 shadow-2xl backdrop-blur-lg">
          <button
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="mb-3 text-2xl">👽</div>
          <h3 className="text-base font-bold text-slate-800">Orim AI Agent</h3>
          <p className="mt-1 text-sm text-slate-500">Coming Soon</p>
          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <p className="text-xs leading-relaxed text-slate-600">
              The Orim AI agent will help you create templates, arrange objects, and manipulate your board with natural language commands.
            </p>
            <div className="mt-3 space-y-1.5">
              <p className="text-[11px] text-slate-400">&quot;Create a SWOT analysis&quot;</p>
              <p className="text-[11px] text-slate-400">&quot;Arrange sticky notes in a grid&quot;</p>
              <p className="text-[11px] text-slate-400">&quot;Add a yellow note that says Research&quot;</p>
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed right-6 bottom-6 z-[9999] flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-xl"
        title="Orim AI Agent"
      >
        <span className="text-xl">👽</span>
      </button>
    </>
  )
}
