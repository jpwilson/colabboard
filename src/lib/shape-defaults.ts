import type { ShapeType } from './board-sync'

interface ShapeDefault {
  width: number
  height: number
  fill: string
  stroke?: string
  strokeWidth?: number
}

export const SHAPE_DEFAULTS: Record<ShapeType, ShapeDefault> = {
  sticky_note: { width: 150, height: 150, fill: '#fef08a' },
  rectangle: { width: 120, height: 80, fill: '#e2e8f0', stroke: '#94a3b8', strokeWidth: 1 },
  rounded_rectangle: { width: 120, height: 80, fill: '#e2e8f0', stroke: '#94a3b8', strokeWidth: 1 },
  circle: { width: 100, height: 100, fill: '#bfdbfe', stroke: '#3b82f6', strokeWidth: 1 },
  ellipse: { width: 140, height: 90, fill: '#bfdbfe', stroke: '#3b82f6', strokeWidth: 1 },
  triangle: { width: 120, height: 100, fill: '#bbf7d0', stroke: '#22c55e', strokeWidth: 1 },
  diamond: { width: 100, height: 120, fill: '#fde68a', stroke: '#eab308', strokeWidth: 1 },
  star: { width: 120, height: 120, fill: '#fde68a', stroke: '#f97316', strokeWidth: 1 },
  arrow: { width: 150, height: 4, fill: '#1f2937', stroke: '#1f2937', strokeWidth: 2 },
  line: { width: 150, height: 0, fill: 'transparent', stroke: '#1f2937', strokeWidth: 2 },
  hexagon: { width: 110, height: 100, fill: '#c4b5fd', stroke: '#8b5cf6', strokeWidth: 1 },
  pentagon: { width: 110, height: 100, fill: '#fbcfe8', stroke: '#ec4899', strokeWidth: 1 },
  freedraw: { width: 0, height: 0, fill: 'transparent', stroke: '#1f2937', strokeWidth: 3 },
  connector: { width: 0, height: 0, fill: 'transparent', stroke: '#1f2937', strokeWidth: 2 },
}

export const STICKY_COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fde68a', '#c4b5fd', '#fed7aa', '#fecaca']

export const STICKY_SIZES = [
  { label: 'S', width: 100, height: 100 },
  { label: 'M', width: 150, height: 150 },
  { label: 'L', width: 200, height: 200 },
] as const
