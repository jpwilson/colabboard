'use client'

import { useState, useRef, useEffect } from 'react'
import type { ShapeType } from '@/lib/board-sync'
import { STICKY_COLORS } from '@/lib/shape-defaults'
import { OrimLogo } from '@/components/ui/OrimLogo'

export type Tool = 'select' | 'sticky_note' | 'shape' | 'freedraw' | 'connector'
export type ShapeTool = Exclude<ShapeType, 'sticky_note' | 'freedraw'>

const SHAPE_OPTIONS: { type: ShapeTool; label: string; icon: string }[] = [
  { type: 'rectangle', label: 'Rectangle', icon: '▭' },
  { type: 'rounded_rectangle', label: 'Rounded Rect', icon: '▢' },
  { type: 'circle', label: 'Circle', icon: '●' },
  { type: 'ellipse', label: 'Ellipse', icon: '⬮' },
  { type: 'triangle', label: 'Triangle', icon: '△' },
  { type: 'diamond', label: 'Diamond', icon: '◇' },
  { type: 'star', label: 'Star', icon: '★' },
  { type: 'hexagon', label: 'Hexagon', icon: '⬡' },
  { type: 'pentagon', label: 'Pentagon', icon: '⬠' },
  { type: 'arrow', label: 'Arrow', icon: '→' },
  { type: 'line', label: 'Line', icon: '╱' },
]

interface ToolbarProps {
  tool: Tool
  shapeTool: ShapeTool
  stickyColor: string
  selectedId: string | null
  boardSlug?: string
  boardName?: string
  boardId?: string
  isOwner?: boolean
  stageScale?: number
  gridMode?: 'none' | 'dots' | 'lines'
  onToolChange: (tool: Tool) => void
  onShapeToolChange: (shape: ShapeTool) => void
  onStickyColorChange: (color: string) => void
  onDelete: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onZoomFit?: () => void
  onRename?: (newName: string) => void
  onCycleGrid?: () => void
  presenceSlot?: React.ReactNode
}

export function Toolbar({
  tool,
  shapeTool,
  stickyColor,
  selectedId,
  boardSlug,
  boardName,
  boardId: _boardId,
  isOwner,
  gridMode = 'dots',
  onToolChange,
  onShapeToolChange,
  onStickyColorChange,
  onDelete,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onRename,
  onCycleGrid,
  presenceSlot,
}: ToolbarProps) {
  const [shapeDropdownOpen, setShapeDropdownOpen] = useState(false)
  const [stickyDropdownOpen, setStickyDropdownOpen] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(boardName || '')
  const shapeDropdownRef = useRef<HTMLDivElement>(null)
  const stickyDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (shapeDropdownRef.current && !shapeDropdownRef.current.contains(e.target as Node)) {
        setShapeDropdownOpen(false)
      }
      if (stickyDropdownRef.current && !stickyDropdownRef.current.contains(e.target as Node)) {
        setStickyDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeShapeOption = SHAPE_OPTIONS.find((s) => s.type === shapeTool) || SHAPE_OPTIONS[0]

  const toolBtnClass = (active: boolean) =>
    `rounded px-3 py-1.5 text-sm font-medium transition ${
      active ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'
    }`

  const handleNameSubmit = () => {
    setEditingName(false)
    if (nameValue.trim() && nameValue.trim() !== boardName && onRename) {
      onRename(nameValue.trim())
    }
  }

  const handleStartEditing = () => {
    if (isOwner && onRename) {
      setNameValue(boardName || '')
      setEditingName(true)
    }
  }

  return (
    <div className="flex items-center gap-1.5 border-b border-slate-200 bg-white px-4 py-2">
      {/* Logo + Dashboard link */}
      <a
        href="/dashboard"
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
      >
        <OrimLogo size="sm" showText={false} />
        <span className="hidden sm:inline">Dashboard</span>
      </a>

      <div className="h-5 w-px bg-slate-200" />

      {/* Board name */}
      {boardName && (
        <>
          {editingName ? (
            <input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') {
                  setNameValue(boardName)
                  setEditingName(false)
                }
              }}
              className="mr-2 max-w-[200px] rounded border border-blue-300 bg-white px-2 py-0.5 text-sm font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-blue-400"
            />
          ) : (
            <span
              className={`mr-2 max-w-[200px] truncate text-sm font-semibold text-slate-700 ${
                isOwner && onRename ? 'cursor-pointer hover:text-blue-600' : ''
              }`}
              onDoubleClick={handleStartEditing}
              title={isOwner ? 'Double-click to rename' : boardName}
            >
              {boardName}
            </span>
          )}
          <div className="h-5 w-px bg-slate-200" />
        </>
      )}

      {/* Select */}
      <button onClick={() => onToolChange('select')} className={toolBtnClass(tool === 'select')}>
        <svg className="inline h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672z" />
        </svg>
      </button>

      {/* Sticky Note with color dropdown */}
      <div className="relative" ref={stickyDropdownRef}>
        <div className="flex">
          <button
            onClick={() => onToolChange('sticky_note')}
            className={`rounded-l px-3 py-1.5 text-sm font-medium transition ${
              tool === 'sticky_note' ? 'bg-yellow-100 text-yellow-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="mr-1 inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: stickyColor }} />
            Note
          </button>
          <button
            onClick={() => setStickyDropdownOpen(!stickyDropdownOpen)}
            className={`rounded-r border-l border-slate-200 px-1 py-1.5 text-xs transition ${
              tool === 'sticky_note' ? 'bg-yellow-100 text-yellow-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ▾
          </button>
        </div>
        {stickyDropdownOpen && (
          <div className="absolute top-full left-0 z-50 mt-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Color</p>
            <div className="grid grid-cols-4 gap-1">
              {STICKY_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    onStickyColorChange(color)
                    setStickyDropdownOpen(false)
                  }}
                  className={`h-6 w-6 rounded-sm border transition-transform hover:scale-110 ${
                    stickyColor === color ? 'border-slate-800 ring-1 ring-slate-800' : 'border-slate-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Shapes dropdown */}
      <div className="relative" ref={shapeDropdownRef}>
        <div className="flex">
          <button
            onClick={() => onToolChange('shape')}
            className={`rounded-l px-3 py-1.5 text-sm font-medium transition ${
              tool === 'shape' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="mr-1">{activeShapeOption.icon}</span>
            {activeShapeOption.label}
          </button>
          <button
            onClick={() => setShapeDropdownOpen(!shapeDropdownOpen)}
            className={`rounded-r border-l border-slate-200 px-1 py-1.5 text-xs transition ${
              tool === 'shape' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ▾
          </button>
        </div>
        {shapeDropdownOpen && (
          <div className="absolute top-full left-0 z-50 mt-1 w-52 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Shapes</p>
            <div className="grid grid-cols-3 gap-1">
              {SHAPE_OPTIONS.map((shape) => (
                <button
                  key={shape.type}
                  onClick={() => {
                    onShapeToolChange(shape.type)
                    onToolChange('shape')
                    setShapeDropdownOpen(false)
                  }}
                  className={`flex flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-xs transition hover:bg-slate-100 ${
                    shapeTool === shape.type ? 'bg-primary/10 text-primary' : 'text-slate-600'
                  }`}
                >
                  <span className="text-base">{shape.icon}</span>
                  <span className="text-[10px] leading-tight">{shape.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Freedraw */}
      <button
        onClick={() => onToolChange('freedraw')}
        className={toolBtnClass(tool === 'freedraw')}
        title="Free draw"
      >
        <svg className="inline h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
        </svg>
      </button>

      {/* Connector */}
      <button
        onClick={() => onToolChange('connector')}
        className={toolBtnClass(tool === 'connector')}
        title="Connect objects"
      >
        <svg className="inline h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
      </button>

      {/* Delete */}
      {selectedId && (
        <>
          <div className="h-5 w-px bg-slate-200" />
          <button
            onClick={onDelete}
            className="rounded px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            <svg className="inline h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </>
      )}

      <div className="flex-1" />

      {/* Grid cycle: none → dots → lines */}
      {onCycleGrid && (
        <button
          onClick={onCycleGrid}
          className={`flex items-center gap-1 rounded px-2 py-1.5 text-sm transition ${
            gridMode !== 'none' ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-100'
          }`}
          title={`Grid: ${gridMode} (click to cycle)`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={gridMode !== 'none' ? 2 : 1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
          <span className="text-[10px] font-medium">{gridMode === 'none' ? 'Off' : gridMode === 'dots' ? 'Dots' : 'Lines'}</span>
        </button>
      )}

      {/* Zoom controls — fit button instead of percentage */}
      {onZoomIn && onZoomOut && (
        <div className="flex items-center gap-0.5">
          <button
            onClick={onZoomOut}
            className="rounded px-1.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
            title="Zoom out (Cmd -)"
          >
            −
          </button>
          <button
            onClick={onZoomFit}
            className="rounded px-1.5 py-1 text-slate-500 hover:bg-slate-100"
            title="Fit to content (Cmd 0)"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          </button>
          <button
            onClick={onZoomIn}
            className="rounded px-1.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
            title="Zoom in (Cmd +)"
          >
            +
          </button>
        </div>
      )}

      <div className="h-5 w-px bg-slate-200" />

      {presenceSlot}

      {/* Share button */}
      {boardSlug && (
        <button
          onClick={() => {
            const url = `${window.location.origin}/board/${boardSlug}/join`
            navigator.clipboard.writeText(url)
            setShareCopied(true)
            setTimeout(() => setShareCopied(false), 2000)
          }}
          className="rounded px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          title="Copy invite link"
        >
          <svg className="mr-1 inline h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
          {shareCopied ? 'Link copied!' : 'Share'}
        </button>
      )}

      {/* Help text */}
      <span className="hidden text-xs text-slate-400 lg:inline">
        {tool === 'select' && 'Click to select, scroll to zoom'}
        {tool === 'sticky_note' && 'Click to place sticky note'}
        {tool === 'shape' && `Click to place ${activeShapeOption.label.toLowerCase()}`}
        {tool === 'freedraw' && 'Click and drag to draw'}
        {tool === 'connector' && 'Click source, then target object'}
      </span>
    </div>
  )
}
