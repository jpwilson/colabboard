'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import type { CanvasObject } from '@/lib/board-sync'
import { useDraggable } from '@/hooks/useDraggable'
import { useIdleAnimation } from '@/hooks/useIdleAnimation'

interface AiAgentPanelProps {
  boardId: string
  objects: CanvasObject[]
  onAddObject: (obj: CanvasObject) => void
  onUpdateObject: (id: string, updates: Partial<CanvasObject>) => void
  onDeleteObject: (id: string) => void
  nextZIndex: number
}

interface UndoEntry {
  type: 'create' | 'update' | 'delete' | 'batch_update'
  createdObjects?: CanvasObject[]
  deletedObject?: CanvasObject
  updateEntry?: { id: string; previous: Partial<CanvasObject>; applied: Partial<CanvasObject> }
  batchUpdateEntries?: Array<{ id: string; previous: Partial<CanvasObject>; applied: Partial<CanvasObject> }>
}

interface UndoGroup {
  messageId: string
  entries: UndoEntry[]
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
  objects,
  onAddObject,
  onUpdateObject,
  onDeleteObject,
  nextZIndex,
}: AiAgentPanelProps) {
  const [open, setOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [verbose, setVerbose] = useState(false)
  const [undoStack, setUndoStack] = useState<UndoGroup[]>([])
  const [redoStack, setRedoStack] = useState<UndoGroup[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const nextZRef = useRef(nextZIndex)
  const processedToolCalls = useRef(new Set<string>())
  const pendingUndoEntries = useRef<Map<string, UndoEntry[]>>(new Map())
  const objectsRef = useRef<CanvasObject[]>(objects)

  const { idleAnimation, resetIdleTimer } = useIdleAnimation()

  const { position: chatPosition, dragHandleProps, isDragging } = useDraggable({
    storageKey: 'orim-chat-position',
    defaultPosition: {
      x: typeof window !== 'undefined' ? window.innerWidth - 340 : 600,
      y: typeof window !== 'undefined' ? window.innerHeight - 520 : 300,
    },
    clampToViewport: true,
    elementSize: { width: 320, height: 480 },
  })

  // Reset idle timer on panel open/close
  useEffect(() => {
    resetIdleTimer()
  }, [open, resetIdleTimer])

  useEffect(() => {
    objectsRef.current = objects
  }, [objects])

  useEffect(() => {
    nextZRef.current = nextZIndex
  }, [nextZIndex])

  const processToolResult = useCallback(
    (result: ToolActionResult, toolCallId: string, messageId: string) => {
      if (processedToolCalls.current.has(toolCallId)) return
      processedToolCalls.current.add(toolCallId)

      if (!result?.action) return

      // Initialize undo entries for this message
      if (!pendingUndoEntries.current.has(messageId)) {
        pendingUndoEntries.current.set(messageId, [])
      }
      const entries = pendingUndoEntries.current.get(messageId)!

      switch (result.action) {
        case 'create': {
          const createdObjects: CanvasObject[] = []
          if (result.object) {
            const obj = {
              ...result.object,
              z_index: nextZRef.current++,
            } as CanvasObject
            onAddObject(obj)
            createdObjects.push(obj)
          }
          // createFrame also returns a titleLabel
          if (result.titleLabel) {
            const label = {
              ...result.titleLabel,
              z_index: nextZRef.current++,
            } as CanvasObject
            onAddObject(label)
            createdObjects.push(label)
          }
          if (createdObjects.length > 0) {
            entries.push({ type: 'create', createdObjects })
          }
          break
        }
        case 'update': {
          if (result.id && result.updates) {
            const current = objectsRef.current.find((o) => o.id === result.id)
            const previousValues: Partial<CanvasObject> = {}
            if (current) {
              for (const key of Object.keys(result.updates)) {
                (previousValues as Record<string, unknown>)[key] =
                  (current as unknown as Record<string, unknown>)[key]
              }
            }
            const applied = result.updates as Partial<CanvasObject>
            onUpdateObject(result.id, applied)
            entries.push({
              type: 'update',
              updateEntry: { id: result.id, previous: previousValues, applied },
            })
          }
          break
        }
        case 'delete': {
          if (result.id) {
            const snapshot = objectsRef.current.find((o) => o.id === result.id)
            onDeleteObject(result.id)
            if (snapshot) {
              entries.push({ type: 'delete', deletedObject: { ...snapshot } })
            }
          }
          break
        }
        case 'batch_update': {
          if (result.batchUpdates) {
            const batchEntries: Array<{ id: string; previous: Partial<CanvasObject>; applied: Partial<CanvasObject> }> = []
            for (const u of result.batchUpdates) {
              const current = objectsRef.current.find((o) => o.id === u.id)
              const previousValues: Partial<CanvasObject> = {}
              if (current) {
                for (const key of Object.keys(u.updates)) {
                  (previousValues as Record<string, unknown>)[key] =
                    (current as unknown as Record<string, unknown>)[key]
                }
              }
              const applied = u.updates as Partial<CanvasObject>
              onUpdateObject(u.id, applied)
              batchEntries.push({ id: u.id, previous: previousValues, applied })
            }
            entries.push({ type: 'batch_update', batchUpdateEntries: batchEntries })
          }
          break
        }
        case 'read':
          break
      }
    },
    [onAddObject, onUpdateObject, onDeleteObject],
  )

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/ai/chat',
        body: { boardId, verbose },
      }),
    [boardId, verbose],
  )

  const { messages, sendMessage, status } = useChat({
    transport,
    onError: (error) => {
      console.error('AI Agent error:', error)
      setErrorMsg('Sorry, something went wrong. Please try again.')
    },
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // Process tool results from message parts and build undo groups
  useEffect(() => {
    const processedMessageIds = new Set<string>()

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
            msg.id,
          )
          processedMessageIds.add(msg.id)
        }
      }
    }

    // Finalize undo groups for processed messages (merge into existing or create new)
    for (const messageId of processedMessageIds) {
      const entries = pendingUndoEntries.current.get(messageId)
      if (entries && entries.length > 0) {
        const newEntries = [...entries]
        setUndoStack((prev) => {
          const existingIdx = prev.findIndex((g) => g.messageId === messageId)
          if (existingIdx >= 0) {
            // Merge new entries into existing group
            const updated = [...prev]
            updated[existingIdx] = {
              messageId,
              entries: [...updated[existingIdx].entries, ...newEntries],
            }
            return updated
          }
          return [...prev, { messageId, entries: newEntries }]
        })
        // Clear redo stack when new AI actions come in
        setRedoStack([])
      }
      pendingUndoEntries.current.delete(messageId)
    }
  }, [messages, processToolResult])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev
      const lastGroup = prev[prev.length - 1]

      // Process entries in reverse order
      for (let i = lastGroup.entries.length - 1; i >= 0; i--) {
        const entry = lastGroup.entries[i]
        switch (entry.type) {
          case 'create':
            for (const obj of entry.createdObjects || []) {
              onDeleteObject(obj.id)
            }
            break
          case 'delete':
            if (entry.deletedObject) {
              onAddObject(entry.deletedObject)
            }
            break
          case 'update':
            if (entry.updateEntry) {
              onUpdateObject(entry.updateEntry.id, entry.updateEntry.previous)
            }
            break
          case 'batch_update':
            if (entry.batchUpdateEntries) {
              for (const u of entry.batchUpdateEntries) {
                onUpdateObject(u.id, u.previous)
              }
            }
            break
        }
      }

      // Push undone group to redo stack
      setRedoStack((redoPrev) => [...redoPrev, lastGroup])
      return prev.slice(0, -1)
    })
  }, [onAddObject, onUpdateObject, onDeleteObject])

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev
      const lastGroup = prev[prev.length - 1]

      // Re-apply entries in forward order
      for (const entry of lastGroup.entries) {
        switch (entry.type) {
          case 'create':
            // Re-add the original objects
            for (const obj of entry.createdObjects || []) {
              onAddObject(obj)
            }
            break
          case 'delete':
            // Re-delete the object
            if (entry.deletedObject) {
              onDeleteObject(entry.deletedObject.id)
            }
            break
          case 'update':
            // Re-apply the update
            if (entry.updateEntry) {
              onUpdateObject(entry.updateEntry.id, entry.updateEntry.applied)
            }
            break
          case 'batch_update':
            // Re-apply all batch updates
            if (entry.batchUpdateEntries) {
              for (const u of entry.batchUpdateEntries) {
                onUpdateObject(u.id, u.applied)
              }
            }
            break
        }
      }

      // Push back to undo stack
      setUndoStack((undoPrev) => [...undoPrev, lastGroup])
      return prev.slice(0, -1)
    })
  }, [onAddObject, onUpdateObject, onDeleteObject])

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
          className={`fixed z-[9999] flex w-80 flex-col rounded-2xl border border-white/30 bg-white/95 shadow-2xl backdrop-blur-lg ${isDragging ? 'select-none' : ''}`}
          style={{
            left: chatPosition.x,
            top: chatPosition.y,
            maxHeight: 'calc(100vh - 40px)',
          }}
        >
          {/* Header — drag handle */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3" {...dragHandleProps}>
            <div className="flex items-center gap-2">
              <div style={{ perspective: '200px' }}>
                <Image
                  src="/AIBot1.png"
                  alt="Orim AI"
                  width={24}
                  height={24}
                  className="h-6 w-6"
                  style={{
                    animation: idleAnimation
                      ? idleAnimation
                      : isLoading
                        ? 'alienThink 1.8s ease-in-out infinite'
                        : 'alienFloat 2s ease-in-out infinite',
                  }}
                />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Orim AI</h3>
              {/* Concise / Verbose toggle pill */}
              <div className="group relative" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                <div
                  className="relative flex h-5 w-[88px] cursor-pointer items-center rounded-full bg-slate-100 text-[10px] font-medium"
                  onClick={() => setVerbose((v) => !v)}
                >
                  <div
                    className={`absolute top-0.5 h-4 w-[42px] rounded-full transition-all duration-200 ${
                      verbose ? 'left-[44px] bg-amber-400' : 'left-0.5 bg-primary'
                    }`}
                  />
                  <span className={`relative z-10 flex-1 text-center transition-colors ${!verbose ? 'text-white' : 'text-slate-500'}`}>
                    Concise
                  </span>
                  <span className={`relative z-10 flex-1 text-center transition-colors ${verbose ? 'text-white' : 'text-slate-500'}`}>
                    Verbose
                  </span>
                </div>
                <div className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-0.5 text-[9px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {verbose ? 'Detailed explanations' : 'Short, action-focused'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleUndo}
                disabled={isLoading || undoStack.length === 0}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                title={undoStack.length > 0 ? `Undo (${undoStack.length} available)` : 'Nothing to undo'}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
                </svg>
              </button>
              <button
                onClick={handleRedo}
                disabled={isLoading || redoStack.length === 0}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                title={redoStack.length > 0 ? `Redo (${redoStack.length} available)` : 'Nothing to redo'}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2M21 10l-4-4M21 10l-4 4" />
                </svg>
              </button>
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

      {/* Floating toggle button — hidden when panel is open */}
      {!open && (
        <button
          onClick={() => { setOpen(true); resetIdleTimer() }}
          className="fixed bottom-6 right-6 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.15),0_2px_8px_rgba(0,0,0,0.1)] transition-all hover:bg-white/90 hover:shadow-[0_12px_40px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.12)]"
          title="Orim AI Agent"
          style={{ perspective: '200px' }}
        >
          <Image
            src="/AIBot1.png"
            alt="Orim AI"
            width={36}
            height={36}
            className="h-9 w-9"
            style={{
              animation: idleAnimation
                ? idleAnimation
                : errorMsg
                  ? 'alienShake 0.3s ease-in-out 3'
                  : isLoading
                    ? 'alienDance 0.8s ease-in-out infinite'
                    : 'alienFloat 2s ease-in-out infinite',
            }}
          />
        </button>
      )}
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
      { label: 'Mind Map', prompt: 'Create a mind map with a central topic and 6 branching ideas' },
      { label: 'Flowchart', prompt: 'Create a flowchart with Start, Process, Decision, and End nodes' },
      { label: 'Timeline', prompt: 'Create a horizontal timeline with 5 milestones' },
      { label: 'Pros & Cons', prompt: 'Create a pros and cons template' },
      { label: 'Decision Matrix', prompt: 'Create a 2x2 decision matrix with Impact vs Effort axes' },
    ],
  },
  {
    label: 'Edit',
    commands: [
      { label: 'Change colors', prompt: 'I want to change the color of some objects on the board' },
      { label: 'Resize objects', prompt: 'I want to resize some objects on the board' },
      { label: 'Move objects', prompt: 'I want to move some objects on the board' },
      { label: 'Duplicate all', prompt: 'Duplicate all sticky notes and place copies next to the originals' },
      { label: 'Update text', prompt: 'I want to update the text on a sticky note' },
      { label: 'Add labels', prompt: 'Add a text label next to each shape on the board' },
      { label: 'Delete all', prompt: 'Delete all objects on the board' },
    ],
  },
  {
    label: 'Layout',
    commands: [
      { label: 'Grid', prompt: 'Arrange all sticky notes in a neat grid' },
      { label: 'Horizontal row', prompt: 'Line up all objects in a horizontal row' },
      { label: 'Vertical column', prompt: 'Stack all objects in a vertical column' },
      { label: 'Distribute evenly', prompt: 'Distribute all objects evenly with equal spacing' },
      { label: 'Sort by color', prompt: 'Group and arrange objects by their color' },
      { label: 'Compact', prompt: 'Move all objects closer together to reduce whitespace' },
      { label: 'Summarize', prompt: 'Describe what is currently on the board' },
    ],
  },
]

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Create: (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  Edit: (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  ),
  Layout: (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  ),
}

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
      <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
        Suggestions
      </p>
      {/* Category tabs */}
      <div className="mb-1.5 flex gap-1.5">
        {SUGGESTION_CATEGORIES.map((cat) => (
          <button
            key={cat.label}
            onClick={() =>
              setActiveCategory(
                activeCategory === cat.label ? null : cat.label,
              )
            }
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-all ${
              activeCategory === cat.label
                ? 'bg-primary text-white shadow-sm'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {CATEGORY_ICONS[cat.label]}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Command pills for active category */}
      {activeCategory && (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTION_CATEGORIES.find(
            (c) => c.label === activeCategory,
          )?.commands.map((cmd) => (
            <button
              key={cmd.label}
              onClick={() => {
                if (!disabled) onSelect(cmd.prompt)
              }}
              disabled={disabled}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-600 transition-all duration-150 hover:border-primary/30 hover:bg-primary/5 hover:text-primary active:scale-95 disabled:opacity-50"
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
