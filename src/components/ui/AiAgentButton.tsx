'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import type { CanvasObject } from '@/lib/board-sync'

interface AiAgentPanelProps {
  boardId: string
  onAddObject: (obj: CanvasObject) => void
  onUpdateObject: (id: string, updates: Partial<CanvasObject>) => void
  onDeleteObject: (id: string) => void
  nextZIndex: number
}

interface ToolActionResult {
  action: 'create' | 'update' | 'delete' | 'read' | 'batch_update'
  object?: Record<string, unknown>
  titleLabel?: Record<string, unknown> // createFrame returns a title label too
  id?: string
  updates?: Record<string, unknown>
  batchUpdates?: Array<{ id: string; updates: Record<string, unknown> }>
  objects?: unknown[]
  count?: number
  error?: string
}

export function AiAgentPanel({
  boardId,
  onAddObject,
  onUpdateObject,
  onDeleteObject,
  nextZIndex,
}: AiAgentPanelProps) {
  const [open, setOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const nextZRef = useRef(nextZIndex)
  const processedToolCalls = useRef(new Set<string>())

  useEffect(() => {
    nextZRef.current = nextZIndex
  }, [nextZIndex])

  const processToolResult = useCallback(
    (result: ToolActionResult, toolCallId: string) => {
      if (processedToolCalls.current.has(toolCallId)) return
      processedToolCalls.current.add(toolCallId)

      if (!result?.action) return

      switch (result.action) {
        case 'create':
          if (result.object) {
            const obj = {
              ...result.object,
              z_index: nextZRef.current++,
            } as CanvasObject
            onAddObject(obj)
          }
          // createFrame also returns a titleLabel
          if (result.titleLabel) {
            const label = {
              ...result.titleLabel,
              z_index: nextZRef.current++,
            } as CanvasObject
            onAddObject(label)
          }
          break
        case 'update':
          if (result.id && result.updates) {
            onUpdateObject(result.id, result.updates as Partial<CanvasObject>)
          }
          break
        case 'delete':
          if (result.id) {
            onDeleteObject(result.id)
          }
          break
        case 'batch_update':
          if (result.batchUpdates) {
            for (const u of result.batchUpdates) {
              onUpdateObject(u.id, u.updates as Partial<CanvasObject>)
            }
          }
          break
        case 'read':
          break
      }
    },
    [onAddObject, onUpdateObject, onDeleteObject],
  )

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai/chat',
      body: { boardId },
    }),
    onError: (error) => {
      console.error('AI Agent error:', error)
      setErrorMsg('Sorry, something went wrong. Please try again.')
    },
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // Process tool results from message parts
  // AI SDK v6 UIMessage tool parts:
  //   type: 'tool-${toolName}' (e.g. 'tool-createFrame') or 'dynamic-tool'
  //   toolCallId: string
  //   state: 'output-available' (when tool has returned)
  //   output: the tool's return value
  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== 'assistant') continue
      for (const part of msg.parts) {
        const p = part as Record<string, unknown>
        const isToolPart =
          typeof p.type === 'string' &&
          (p.type.startsWith('tool-') || p.type === 'dynamic-tool')
        if (
          isToolPart &&
          p.state === 'output-available' &&
          typeof p.toolCallId === 'string' &&
          p.output !== undefined
        ) {
          processToolResult(
            p.output as ToolActionResult,
            p.toolCallId as string,
          )
        }
      }
    }
  }, [messages, processToolResult])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const form = e.currentTarget
      const input = form.elements.namedItem('message') as HTMLInputElement
      const text = input.value.trim()
      if (!text || isLoading) return
      setErrorMsg(null)
      sendMessage({ text })
      input.value = ''
    },
    [sendMessage, isLoading],
  )

  const handleSuggestion = useCallback(
    (prompt: string) => {
      if (isLoading) return
      setErrorMsg(null)
      sendMessage({ text: prompt })
    },
    [sendMessage, isLoading],
  )

  return (
    <>
      {/* Expanded chat panel */}
      {open && (
        <div
          className="fixed bottom-20 right-6 z-[9999] flex w-80 flex-col rounded-2xl border border-white/30 bg-white/95 shadow-2xl backdrop-blur-lg"
          style={{ maxHeight: 'calc(100vh - 120px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">👽</span>
              <h3 className="text-sm font-semibold text-slate-800">Orim AI</h3>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-3"
            style={{ maxHeight: '350px', minHeight: '150px' }}
          >
            {messages.length === 0 ? (
              <p className="text-xs text-slate-500">
                Ask me to create, arrange, or manipulate objects on your
                board. Try one of the suggestions below.
              </p>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {isLoading && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                    Thinking...
                  </div>
                )}
                {errorMsg && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                    {errorMsg}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Suggestions — always visible */}
          <SuggestionPills onSelect={handleSuggestion} disabled={isLoading} />

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-slate-100 px-3 py-2">
            <div className="flex gap-2">
              <input
                name="message"
                type="text"
                placeholder="Ask Orim..."
                disabled={isLoading}
                className="flex-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary-dark disabled:opacity-50"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 19V5m-7 7l7-7 7 7"
                  />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-[9999] flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-xl"
        title="Orim AI Agent"
      >
        <span className="text-xl">👽</span>
      </button>
    </>
  )
}

const SUGGESTION_CATEGORIES = [
  {
    label: 'Create',
    commands: [
      { label: 'SWOT Analysis', prompt: 'Create a SWOT analysis template' },
      { label: 'Kanban Board', prompt: 'Create a Kanban board with To Do, In Progress, and Done columns' },
      { label: 'Retrospective', prompt: 'Create a retrospective with Went Well, To Improve, and Actions' },
      { label: 'Pros & Cons', prompt: 'Create a pros and cons template' },
      { label: 'Sticky Note', prompt: 'Add a sticky note that says "New idea"' },
      { label: 'Shape', prompt: 'Add a blue circle' },
    ],
  },
  {
    label: 'Edit',
    commands: [
      { label: 'Change colors', prompt: 'Change all sticky notes to green' },
      { label: 'Resize objects', prompt: 'Make all sticky notes larger' },
      { label: 'Move objects', prompt: 'Move all sticky notes to the right' },
      { label: 'Delete all', prompt: 'Delete all objects on the board' },
      { label: 'Update text', prompt: 'Change the text on the first sticky note to "Updated"' },
    ],
  },
  {
    label: 'Layout',
    commands: [
      { label: 'Grid', prompt: 'Arrange all sticky notes in a neat grid' },
      { label: 'Horizontal row', prompt: 'Line up all objects in a horizontal row' },
      { label: 'Summarize', prompt: 'Describe what is currently on the board' },
    ],
  },
]

function SuggestionPills({
  onSelect,
  disabled,
}: {
  onSelect: (prompt: string) => void
  disabled: boolean
}) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  return (
    <div className="border-t border-slate-100 px-3 py-2">
      {/* Category tabs */}
      <div className="mb-1.5 flex gap-1">
        {SUGGESTION_CATEGORIES.map((cat) => (
          <button
            key={cat.label}
            onClick={() =>
              setActiveCategory(
                activeCategory === cat.label ? null : cat.label,
              )
            }
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
              activeCategory === cat.label
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Command pills for active category */}
      {activeCategory && (
        <div className="flex flex-wrap gap-1">
          {SUGGESTION_CATEGORIES.find(
            (c) => c.label === activeCategory,
          )?.commands.map((cmd) => (
            <button
              key={cmd.label}
              onClick={() => {
                if (!disabled) onSelect(cmd.prompt)
              }}
              disabled={disabled}
              className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
            >
              {cmd.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MessageBubble({ message }: { message: UIMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-xl rounded-br-sm bg-primary px-3 py-2 text-xs text-white">
          {message.parts.map((part, i) =>
            part.type === 'text' ? <span key={i}>{part.text}</span> : null,
          )}
        </div>
      </div>
    )
  }

  // Assistant message
  const textParts: string[] = []
  let toolCount = 0

  for (const part of message.parts) {
    if (part.type === 'text' && part.text.trim()) {
      textParts.push(part.text)
    } else {
      // Count tool parts (type is 'tool-${name}' or 'dynamic-tool')
      const pType = (part as Record<string, unknown>).type
      if (
        typeof pType === 'string' &&
        (pType.startsWith('tool-') || pType === 'dynamic-tool')
      ) {
        toolCount++
      }
    }
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-1">
        {textParts.map((text, i) => (
          <div
            key={i}
            className="rounded-xl rounded-bl-sm bg-slate-100 px-3 py-2 text-xs text-slate-700"
          >
            {text}
          </div>
        ))}
        {toolCount > 0 && (
          <div className="text-[10px] text-slate-400">
            Executed {toolCount} action{toolCount > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
