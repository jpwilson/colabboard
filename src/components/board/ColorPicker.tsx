'use client'

import { useState, useRef, useEffect } from 'react'
import { UNIFIED_COLORS, COLOR_NAMES } from '@/lib/shape-defaults'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label: string
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const nativeInputRef = useRef<HTMLInputElement>(null)

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={containerRef}>
      <p className="mb-1 text-xs font-medium text-slate-500">{label}</p>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded border border-slate-300 px-2 py-1 transition hover:border-slate-400"
      >
        <span
          className="inline-block h-5 w-5 rounded border border-slate-200"
          style={{ backgroundColor: value }}
        />
        <span className="text-xs text-slate-600">{COLOR_NAMES[value] || value}</span>
        <svg className={`ml-auto h-3 w-3 text-slate-400 transition ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-[216px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="grid grid-cols-6 gap-2">
            {UNIFIED_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => {
                  onChange(color)
                  setOpen(false)
                }}
                className={`h-7 w-7 rounded-full border-2 transition-all hover:scale-110 ${
                  value === color
                    ? 'border-slate-700 ring-2 ring-slate-700 ring-offset-1'
                    : 'border-white shadow-sm hover:shadow-md'
                }`}
                style={{ backgroundColor: color }}
                title={COLOR_NAMES[color] || color}
              />
            ))}
          </div>

          {/* Custom color button */}
          <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2">
            <button
              onClick={() => nativeInputRef.current?.click()}
              className="flex flex-1 items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-2 py-1.5 text-xs text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
              </svg>
              Custom color
            </button>
            <input
              ref={nativeInputRef}
              type="color"
              value={value}
              onChange={(e) => {
                onChange(e.target.value)
              }}
              className="sr-only"
            />
          </div>
        </div>
      )}
    </div>
  )
}
