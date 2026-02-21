'use client'

import { useState } from 'react'

const FAQ_ITEMS = [
  {
    q: 'How do I create objects on the board?',
    a: 'Select a tool from the toolbar (sticky note, shape, text, or freedraw) then click on the canvas to place the object. You can also use the AI agent to create templates.',
  },
  {
    q: 'How do I select multiple objects?',
    a: 'Hold Shift and click objects to add/remove from selection. You can also Shift+drag on empty canvas to marquee-select. Use Cmd+A to select all.',
  },
  {
    q: 'How do I edit text on sticky notes?',
    a: 'Double-click any sticky note or text element to enter edit mode. Press Escape or click outside to finish editing.',
  },
  {
    q: 'How do connectors work?',
    a: 'Select the Connector tool, click the source object, then click the target object. Connectors automatically snap to edges and move with objects.',
  },
  {
    q: 'How do I share my board?',
    a: 'Click the Share button in the toolbar. You can invite collaborators by email or copy a join link. Set permissions for each collaborator.',
  },
  {
    q: 'How does the AI agent work?',
    a: 'Click the alien avatar and choose "Chat". Ask the AI to create templates (SWOT, Kanban, etc.), arrange objects, change colors, or describe what\'s on the board.',
  },
  {
    q: 'Can I undo/redo changes?',
    a: 'Yes! Use Cmd+Z to undo and Cmd+Shift+Z to redo. The undo/redo buttons in the toolbar also work. AI agent actions have their own undo in the chat panel.',
  },
  {
    q: 'How do I zoom and pan?',
    a: 'Scroll to zoom in/out. Click and drag on empty canvas to pan. Use Cmd+0 to fit all content in view, or use the +/- buttons in the toolbar.',
  },
  {
    q: 'What keyboard shortcuts are available?',
    a: 'Cmd+C/V for copy/paste, Cmd+D to duplicate, Delete/Backspace to remove, Cmd+A to select all, Cmd+Z/Shift+Z for undo/redo, Cmd+/-/0 for zoom.',
  },
  {
    q: 'Can I see who else is on the board?',
    a: 'Yes — collaborator avatars appear in the toolbar. Their cursors are visible on the canvas in real-time with colored labels.',
  },
]

interface BoardFAQProps {
  onClose: () => void
}

export function BoardFAQ({ onClose }: BoardFAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative mx-4 max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/30 bg-white/95 p-6 shadow-2xl backdrop-blur-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Frequently Asked Questions</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Accordion */}
        <div className="divide-y divide-slate-100">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-slate-700 transition hover:text-primary"
              >
                <span>{item.q}</span>
                <svg
                  className={`ml-2 h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${openIndex === i ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === i && (
                <p className="pb-3 text-xs leading-relaxed text-slate-500">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
