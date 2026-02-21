'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import type { CanvasObject } from '@/lib/board-sync'
import { useDraggable } from '@/hooks/useDraggable'
import { useIdleAnimation } from '@/hooks/useIdleAnimation'
import { BoardFAQ } from '@/components/board/BoardFAQ'
import { BoardTour } from '@/components/board/BoardTour'
import { getAllDomains, getDomainPack } from '@/lib/ai/template-registry'

interface AiAgentPanelProps {
  boardId: string
  objects: CanvasObject[]
  onAddObject: (obj: CanvasObject) => void
  onUpdateObject: (id: string, updates: Partial<CanvasObject>) => void
  onDeleteObject: (id: string) => void
  nextZIndex: number
  onFitToContent?: () => void
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
  onFitToContent,
}: AiAgentPanelProps) {
  const [open, setOpen] = useState(false)
  const [faqOpen, setFaqOpen] = useState(false)
  const [extrasOpen, setExtrasOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [verbose, setVerbose] = useState(true)
  const [textSize, setTextSize] = useState<'sm' | 'md' | 'lg'>(() => {
    if (typeof window === 'undefined') return 'md'
    try {
      const stored = localStorage.getItem('orim-chat-text-size')
      if (stored === 'sm' || stored === 'md' || stored === 'lg') return stored
    } catch { /* ignore */ }
    return 'md'
  })
  const [undoStack, setUndoStack] = useState<UndoGroup[]>([])
  const [redoStack, setRedoStack] = useState<UndoGroup[]>([])
  const [panelSize, setPanelSize] = useState<{ width: number; height: number }>(() => {
    if (typeof window === 'undefined') return { width: 320, height: 480 }
    try {
      const stored = localStorage.getItem('orim-chat-size')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
          return {
            width: Math.max(280, Math.min(600, parsed.width)),
            height: Math.max(300, Math.min(800, parsed.height)),
          }
        }
      }
    } catch { /* ignore */ }
    return { width: 320, height: 480 }
  })
  const handleTextSizeChange = useCallback((size: 'sm' | 'md' | 'lg') => {
    setTextSize(size)
    try { localStorage.setItem('orim-chat-text-size', size) } catch { /* ignore */ }
  }, [])

  const [selectedDomain, setSelectedDomain] = useState<string>(() => {
    if (typeof window === 'undefined') return 'general'
    try {
      const stored = localStorage.getItem('orim-chat-domain')
      if (stored) return stored
    } catch { /* ignore */ }
    return 'general'
  })
  const handleDomainChange = useCallback((domainId: string) => {
    setSelectedDomain(domainId)
    try { localStorage.setItem('orim-chat-domain', domainId) } catch { /* ignore */ }
  }, [])

  // Text size CSS classes
  const msgTextClass = textSize === 'sm' ? 'text-xs' : textSize === 'lg' ? 'text-base' : 'text-sm'
  const pillTextClass = textSize === 'sm' ? 'text-[10px]' : textSize === 'lg' ? 'text-sm' : 'text-xs'
  const headerTextClass = textSize === 'sm' ? 'text-sm' : textSize === 'lg' ? 'text-lg' : 'text-[15px]'

  const scrollRef = useRef<HTMLDivElement>(null)
  const nextZRef = useRef(nextZIndex)
  const processedToolCalls = useRef(new Set<string>())
  const pendingUndoEntries = useRef<Map<string, UndoEntry[]>>(new Map())
  const objectsRef = useRef<CanvasObject[]>(objects)

  const panelSizeRef = useRef(panelSize)
  useEffect(() => { panelSizeRef.current = panelSize }, [panelSize])

  const isResizing = useRef(false)
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 })

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isResizing.current = true
    resizeStart.current = { x: e.clientX, y: e.clientY, w: panelSizeRef.current.width, h: panelSizeRef.current.height }

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return
      const newW = Math.max(280, Math.min(600, resizeStart.current.w + (ev.clientX - resizeStart.current.x)))
      const newH = Math.max(300, Math.min(800, resizeStart.current.h + (ev.clientY - resizeStart.current.y)))
      setPanelSize({ width: newW, height: newH })
    }

    const handleMouseUp = () => {
      isResizing.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      try { localStorage.setItem('orim-chat-size', JSON.stringify(panelSizeRef.current)) } catch { /* ignore */ }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  const { idleAnimation, resetIdleTimer } = useIdleAnimation()

  const { position: chatPosition, dragHandleProps, isDragging } = useDraggable({
    storageKey: 'orim-chat-position',
    defaultPosition: {
      x: typeof window !== 'undefined' ? window.innerWidth - (panelSize.width + 20) : 600,
      y: typeof window !== 'undefined' ? window.innerHeight - (panelSize.height + 40) : 300,
    },
    clampToViewport: true,
    elementSize: { width: panelSize.width, height: panelSize.height },
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
        body: { boardId, verbose, domain: selectedDomain },
      }),
    [boardId, verbose, selectedDomain],
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
    let hasMutations = false

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
          const result = p.output as ToolActionResult
          // Track if this is a new mutation (not read, not already processed)
          if (
            result?.action &&
            result.action !== 'read' &&
            !processedToolCalls.current.has(p.toolCallId as string)
          ) {
            hasMutations = true
          }
          processToolResult(
            result,
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

    // Auto-center viewport after AI mutations
    if (hasMutations && onFitToContent) {
      setTimeout(() => onFitToContent(), 350)
    }
  }, [messages, processToolResult, onFitToContent])

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
          className={`fixed z-[9999] flex flex-col rounded-2xl border-2 border-slate-300 bg-white/95 shadow-[0_20px_60px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1)] backdrop-blur-xl ${isDragging ? 'select-none' : ''}`}
          style={{
            left: chatPosition.x,
            top: chatPosition.y,
            width: panelSize.width,
            height: panelSize.height,
            maxHeight: 'calc(100vh - 40px)',
          }}
        >
          {/* Header — drag handle */}
          <div className="flex items-center justify-between border-b-2 border-slate-300 bg-slate-50/50 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]" {...dragHandleProps}>
            <div className="flex items-center gap-2">
              <div style={{ perspective: '200px' }}>
                <Image
                  src="/AIBot1.png"
                  alt="Orim AI"
                  width={32}
                  height={32}
                  className="h-8 w-8"
                  style={{
                    animation: idleAnimation
                      ? idleAnimation
                      : isLoading
                        ? 'alienThink 1.8s ease-in-out infinite'
                        : 'alienFloat 2s ease-in-out infinite',
                  }}
                />
              </div>
              <h3 className={`font-nunito font-bold tracking-tight text-slate-800 ${headerTextClass}`}>Orim AI</h3>
            </div>
            {/* Concise / Verbose toggle pill — centered */}
            <div className="group relative" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
              <div
                className="relative flex h-6 w-[110px] cursor-pointer items-center rounded-full bg-slate-200/70 text-xs font-semibold"
                onClick={() => setVerbose((v) => !v)}
              >
                <div
                  className={`absolute top-0.5 h-5 w-[53px] rounded-full transition-all duration-200 ${
                    verbose ? 'left-[55px] bg-accent' : 'left-0.5 bg-accent'
                  }`}
                />
                <span className={`relative z-10 flex-1 text-center transition-colors ${!verbose ? 'text-slate-800' : 'text-slate-500'}`}>
                  Concise
                </span>
                <span className={`relative z-10 flex-1 text-center transition-colors ${verbose ? 'text-slate-800' : 'text-slate-500'}`}>
                  Verbose
                </span>
              </div>
              <div className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-0.5 text-[9px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                {verbose ? 'Detailed explanations' : 'Short, action-focused'}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleUndo}
                disabled={isLoading || undoStack.length === 0}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                title={undoStack.length > 0 ? `Undo (${undoStack.length} available)` : 'Nothing to undo'}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
                </svg>
              </button>
              <button
                onClick={handleRedo}
                disabled={isLoading || redoStack.length === 0}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                title={redoStack.length > 0 ? `Redo (${redoStack.length} available)` : 'Nothing to redo'}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2M21 10l-4-4M21 10l-4 4" />
                </svg>
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <svg
                className="h-5 w-5"
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
            style={{ minHeight: '100px' }}
          >
            {messages.length === 0 ? (
              <p className={`${msgTextClass} leading-relaxed text-slate-500`}>
                Ask me to create, arrange, or manipulate objects on your
                board. Try one of the suggestions below.
              </p>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} msgTextClass={msgTextClass} pillTextClass={pillTextClass} />
                ))}
                {isLoading && (
                  <div className={`flex items-center gap-1.5 ${pillTextClass} text-slate-400`}>
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
                    Thinking...
                  </div>
                )}
                {errorMsg && (
                  <div className={`rounded-lg bg-red-50 px-3 py-2 ${pillTextClass} text-red-600`}>
                    {errorMsg}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Suggestions — always visible */}
          <SuggestionPills onSelect={handleSuggestion} disabled={isLoading} pillTextClass={pillTextClass} selectedDomain={selectedDomain} onDomainChange={handleDomainChange} />

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-slate-100 px-3 py-2">
            <div className="flex gap-2">
              <input
                name="message"
                type="text"
                placeholder="Ask Orim..."
                disabled={isLoading}
                className={`flex-1 rounded-xl bg-slate-50/80 px-3 py-2.5 ${msgTextClass} text-slate-800 placeholder:text-slate-400/70 focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50`}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-xl bg-accent px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-accent-dark hover:shadow disabled:opacity-50"
              >
                <svg
                  className="h-5 w-5"
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

          {/* Resize handle */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute right-0 bottom-0 h-4 w-4 cursor-se-resize rounded-bl-lg opacity-30 transition-opacity hover:opacity-70"
          >
            <svg className="h-4 w-4 text-slate-400" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="8" cy="12" r="1.5" />
              <circle cx="12" cy="8" r="1.5" />
            </svg>
          </div>

          {/* Extras tab — Tour & FAQ */}
          <div className="border-t border-accent/30 bg-accent/5">
            <button
              onClick={() => setExtrasOpen(!extrasOpen)}
              className="flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest text-accent-dark transition hover:bg-accent/10"
            >
              <svg
                className={`h-3.5 w-3.5 transition-transform ${extrasOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
              {extrasOpen ? 'HIDE' : 'MORE'}
            </button>
            {extrasOpen && (
              <div className="space-y-2 px-3 pb-3" style={{ animation: 'fadeIn 0.15s ease-out' }}>
                {/* Text Size Widget */}
                <div className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2">
                  <span className="text-xs font-medium text-slate-500">Text Size</span>
                  <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
                    {(['sm', 'md', 'lg'] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => handleTextSizeChange(size)}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                          textSize === size
                            ? 'bg-primary text-slate-800 shadow-sm'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {size === 'sm' ? 'S' : size === 'md' ? 'M' : 'L'}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Tour & FAQ */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setExtrasOpen(false); setTourOpen(true) }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Take a Tour
                  </button>
                  <button
                    onClick={() => { setExtrasOpen(false); setFaqOpen(true) }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    FAQ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating robot button — click opens chat directly */}
      {!open && (
        <div className="fixed bottom-6 right-6 z-[9999]" data-tour-step="ai-hub">
          <button
            onClick={() => { setOpen(true); resetIdleTimer() }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.15),0_2px_8px_rgba(0,0,0,0.1)] transition-all hover:bg-white/90 hover:shadow-[0_12px_40px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.12)]"
            title="Ask Orim AI"
            style={{ perspective: '200px' }}
          >
            <Image
              src="/AIBot1.png"
              alt="Orim AI"
              width={42}
              height={42}
              className="h-[42px] w-[42px]"
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
        </div>
      )}

      {/* FAQ Modal */}
      {faqOpen && <BoardFAQ onClose={() => setFaqOpen(false)} />}

      {/* Board Tour */}
      {tourOpen && <BoardTour onClose={() => setTourOpen(false)} />}
    </>
  )
}

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
  pillTextClass,
  selectedDomain,
  onDomainChange,
}: {
  onSelect: (prompt: string) => void
  disabled: boolean
  pillTextClass: string
  selectedDomain: string
  onDomainChange: (domainId: string) => void
}) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const domains = getAllDomains()
  const domainPack = getDomainPack(selectedDomain)

  // Build suggestion categories from domain pack
  const categories = useMemo(() => {
    if (!domainPack) return []
    return [
      {
        label: 'Create',
        commands: domainPack.templates.map((t) => ({
          label: t.name,
          prompt: t.prompt,
        })),
      },
      { label: 'Edit', commands: domainPack.editPrompts },
      { label: 'Layout', commands: domainPack.layoutPrompts },
    ]
  }, [domainPack])

  const labelClass = pillTextClass === 'text-sm' ? 'text-xs' : pillTextClass === 'text-xs' ? 'text-[10px]' : 'text-[9px]'

  return (
    <div className="border-t border-slate-100 px-3 py-2">
      {/* Domain selector */}
      <div className="mb-2 flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {domains.map((d) => (
          <button
            key={d.id}
            onClick={() => { onDomainChange(d.id); setActiveCategory(null) }}
            className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 ${pillTextClass} font-medium whitespace-nowrap transition-all ${
              selectedDomain === d.id
                ? 'bg-primary/20 text-primary-dark shadow-sm ring-1 ring-primary/30'
                : 'text-slate-400 hover:bg-slate-100/80 hover:text-slate-600'
            }`}
          >
            <span>{d.icon}</span>
            {d.name}
          </button>
        ))}
      </div>

      <p className={`font-nunito mb-1.5 ${labelClass} font-bold uppercase tracking-widest text-slate-400/80`}>
        Suggestions
      </p>
      {/* Category tabs */}
      <div className="mb-1.5 flex gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat.label}
            onClick={() =>
              setActiveCategory(
                activeCategory === cat.label ? null : cat.label,
              )
            }
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${pillTextClass} font-semibold tracking-wide transition-all ${
              activeCategory === cat.label
                ? 'bg-primary text-slate-800 shadow-sm'
                : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-700'
            }`}
          >
            {CATEGORY_ICONS[cat.label]}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Command pills for active category */}
      {activeCategory && (
        <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
          {categories.find(
            (c) => c.label === activeCategory,
          )?.commands.map((cmd) => (
            <button
              key={cmd.label}
              onClick={() => {
                if (!disabled) onSelect(cmd.prompt)
              }}
              disabled={disabled}
              className={`rounded-full bg-slate-50 px-2.5 py-1 ${pillTextClass} font-medium text-slate-600 shadow-sm transition-all duration-150 hover:bg-primary/5 hover:text-primary hover:shadow active:scale-95 disabled:opacity-50`}
            >
              {cmd.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MessageBubble({ message, msgTextClass, pillTextClass }: { message: UIMessage; msgTextClass: string; pillTextClass: string }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className={`max-w-[85%] rounded-2xl rounded-br-sm bg-primary-dark px-3 py-2 ${msgTextClass} leading-relaxed text-white`}>
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
            className={`rounded-2xl rounded-bl-sm bg-slate-50 px-3 py-2 ${msgTextClass} leading-relaxed text-slate-700`}
          >
            {text}
          </div>
        ))}
        {toolCount > 0 && (
          <div className={`${pillTextClass} text-slate-400`}>
            Executed {toolCount} action{toolCount > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
