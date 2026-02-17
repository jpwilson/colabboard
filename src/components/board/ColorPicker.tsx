'use client'

import { useState } from 'react'

const PRESET_COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
  '#e2e8f0', '#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#c4b5fd',
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label: string
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [hexInput, setHexInput] = useState(value)

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="grid grid-cols-8 gap-1">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => {
              onChange(color)
              setHexInput(color)
            }}
            className={`h-5 w-5 rounded-sm border transition-transform hover:scale-110 ${
              value === color ? 'border-slate-800 ring-1 ring-slate-800' : 'border-slate-300'
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
      <input
        type="text"
        value={hexInput}
        onChange={(e) => {
          setHexInput(e.target.value)
          if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
            onChange(e.target.value)
          }
        }}
        className="w-full rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-900"
        placeholder="#000000"
      />
    </div>
  )
}
