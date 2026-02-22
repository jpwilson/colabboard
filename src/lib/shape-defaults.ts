import type { ShapeType } from './board-sync'

interface ShapeDefault {
  width: number
  height: number
  fill: string
  stroke?: string
  strokeWidth?: number
}

export const SHAPE_DEFAULTS: Record<ShapeType, ShapeDefault> = {
  sticky_note: { width: 150, height: 150, fill: '#EAB308' },
  rectangle: { width: 120, height: 80, fill: '#0066FF', stroke: '#0044CC', strokeWidth: 1 },
  rounded_rectangle: { width: 120, height: 80, fill: '#7C3AED', stroke: '#6D28D9', strokeWidth: 1 },
  circle: { width: 100, height: 100, fill: '#F97316', stroke: '#EA580C', strokeWidth: 1 },
  ellipse: { width: 140, height: 90, fill: '#059669', stroke: '#047857', strokeWidth: 1 },
  triangle: { width: 120, height: 100, fill: '#0D9488', stroke: '#0F766E', strokeWidth: 1 },
  diamond: { width: 100, height: 120, fill: '#EAB308', stroke: '#CA8A04', strokeWidth: 1 },
  star: { width: 120, height: 120, fill: '#EC4899', stroke: '#DB2777', strokeWidth: 1 },
  arrow: { width: 150, height: 4, fill: '#1f2937', stroke: '#1f2937', strokeWidth: 2 },
  line: { width: 150, height: 0, fill: 'transparent', stroke: '#1f2937', strokeWidth: 2 },
  hexagon: { width: 110, height: 100, fill: '#7C3AED', stroke: '#6D28D9', strokeWidth: 1 },
  pentagon: { width: 110, height: 100, fill: '#EC4899', stroke: '#DB2777', strokeWidth: 1 },
  freedraw: { width: 0, height: 0, fill: 'transparent', stroke: '#1f2937', strokeWidth: 3 },
  connector: { width: 0, height: 0, fill: 'transparent', stroke: '#1f2937', strokeWidth: 2 },
  text: { width: 200, height: 40, fill: '#1f2937' },
}

export const STICKY_COLORS = ['#EAB308', '#0066FF', '#DC2626', '#059669', '#F97316', '#7C3AED', '#EC4899', '#0D9488']

export const STICKY_COLOR_NAMES: Record<string, string> = {
  '#EAB308': 'Golden',
  '#0066FF': 'Electric Blue',
  '#DC2626': 'Crimson',
  '#059669': 'Emerald',
  '#F97316': 'Hot Orange',
  '#7C3AED': 'Royal Purple',
  '#EC4899': 'Magenta',
  '#0D9488': 'Teal',
}

// Unified color palette used by all color pickers (toolbar, properties panel)
// 6 columns × 4 rows = 24 colors: basics, bold, bold secondary, lighter variants
export const UNIFIED_COLORS = [
  // Row 1: basics
  '#000000', '#4b5563', '#9ca3af', '#e2e8f0', '#f8fafc', '#ffffff',
  // Row 2: bold (sticky note defaults)
  '#DC2626', '#F97316', '#EAB308', '#059669', '#0066FF', '#7C3AED',
  // Row 3: bold secondary
  '#EC4899', '#0D9488', '#2563EB', '#D97706', '#16A34A', '#9333EA',
  // Row 4: lighter variants
  '#FCA5A5', '#FDBA74', '#FDE047', '#86EFAC', '#93C5FD', '#C4B5FD',
]

// Human-readable names for all unified colors
export const COLOR_NAMES: Record<string, string> = {
  '#000000': 'Black',
  '#4b5563': 'Dark gray',
  '#9ca3af': 'Gray',
  '#e2e8f0': 'Light gray',
  '#f8fafc': 'Near white',
  '#ffffff': 'White',
  '#DC2626': 'Crimson',
  '#F97316': 'Hot Orange',
  '#EAB308': 'Golden',
  '#059669': 'Emerald',
  '#0066FF': 'Electric Blue',
  '#7C3AED': 'Royal Purple',
  '#EC4899': 'Magenta',
  '#0D9488': 'Teal',
  '#2563EB': 'Blue',
  '#D97706': 'Amber',
  '#16A34A': 'Green',
  '#9333EA': 'Purple',
  '#FCA5A5': 'Rose',
  '#FDBA74': 'Peach',
  '#FDE047': 'Lemon',
  '#86EFAC': 'Mint',
  '#93C5FD': 'Sky',
  '#C4B5FD': 'Lavender',
}

/** Returns white or dark text color based on background luminance (ITU-R BT.709) */
export function getContrastTextColor(bgHex: string): string {
  const hex = bgHex.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#1f2937' : '#ffffff'
}

export const STICKY_SIZES = [
  { label: 'S', width: 100, height: 100 },
  { label: 'M', width: 150, height: 150 },
  { label: 'L', width: 200, height: 200 },
] as const
