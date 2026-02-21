'use client'

import { useState } from 'react'

export interface ChartDataPoint {
  label: string
  value: number
}

export interface ChartSeries {
  name: string
  color: string
  data: ChartDataPoint[]
}

interface SvgLineChartProps {
  series: ChartSeries[]
  height?: number
  yLabel?: string
  className?: string
}

const CHART_COLORS = [
  '#6366f1', // indigo-500
  '#06b6d4', // cyan-500
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#ef4444', // red-500
]

export function SvgLineChart({
  series,
  height = 200,
  yLabel,
  className = '',
}: SvgLineChartProps) {
  const [activePoint, setActivePoint] = useState<{
    seriesIdx: number
    pointIdx: number
  } | null>(null)

  if (series.length === 0 || series.every((s) => s.data.length === 0)) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-sm text-slate-400 ${className}`}
        style={{ height }}
      >
        No data available
      </div>
    )
  }

  // Use the longest series for x-axis labels
  const longestSeries = series.reduce((a, b) =>
    a.data.length >= b.data.length ? a : b,
  )
  const labels = longestSeries.data.map((d) => d.label)
  const pointCount = labels.length

  // Layout
  const padLeft = 50
  const padRight = 20
  const padTop = 15
  const padBottom = 30
  const width = Math.max(400, pointCount * 60)
  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom

  // Y-axis range
  const allValues = series.flatMap((s) => s.data.map((d) => d.value))
  const yMax = Math.ceil(Math.max(...allValues, 1) * 1.15)
  const yMin = 0

  function xPos(i: number): number {
    if (pointCount <= 1) return padLeft + plotW / 2
    return padLeft + (i / (pointCount - 1)) * plotW
  }

  function yPos(v: number): number {
    return padTop + plotH - ((v - yMin) / (yMax - yMin)) * plotH
  }

  // Y-axis grid lines (4 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) =>
    yMin + ((yMax - yMin) * i) / 4,
  )

  // X-axis label spacing
  const labelEvery = Math.max(1, Math.ceil(pointCount / 8))

  function buildLinePath(data: ChartDataPoint[]): string {
    return data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${yPos(d.value)}`)
      .join(' ')
  }

  function buildAreaPath(data: ChartDataPoint[]): string {
    const line = buildLinePath(data)
    const lastX = xPos(data.length - 1)
    const firstX = xPos(0)
    const bottomY = padTop + plotH
    return `${line} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`
  }

  function formatValue(v: number): string {
    if (yLabel === '$') return `$${v < 0.01 ? v.toFixed(4) : v.toFixed(2)}`
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
    return v % 1 === 0 ? String(v) : v.toFixed(2)
  }

  function formatYTick(v: number): string {
    if (yLabel === '$') return `$${v < 1 ? v.toFixed(2) : v.toFixed(0)}`
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
    return v % 1 === 0 ? String(v) : v.toFixed(1)
  }

  return (
    <div className={`relative ${className}`}>
      {/* Legend */}
      {series.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-3 text-xs text-slate-500">
          {series.map((s, i) => (
            <span key={s.name} className="flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: s.color || CHART_COLORS[i % CHART_COLORS.length] }}
              />
              {s.name}
            </span>
          ))}
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="xMidYMid meet"
        className="overflow-visible"
      >
        <defs>
          {series.map((s, i) => {
            const color = s.color || CHART_COLORS[i % CHART_COLORS.length]
            return (
              <linearGradient
                key={`grad-${i}`}
                id={`area-gradient-${i}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                <stop offset="100%" stopColor={color} stopOpacity="0.02" />
              </linearGradient>
            )
          })}
        </defs>

        {/* Y-axis grid lines */}
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={padLeft}
              y1={yPos(tick)}
              x2={width - padRight}
              y2={yPos(tick)}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray={tick === yMin ? undefined : '4,4'}
            />
            <text
              x={padLeft - 8}
              y={yPos(tick) + 4}
              textAnchor="end"
              className="fill-slate-400"
              fontSize="10"
            >
              {formatYTick(tick)}
            </text>
          </g>
        ))}

        {/* Area fills */}
        {series.map(
          (s, i) =>
            s.data.length > 1 && (
              <path
                key={`area-${i}`}
                d={buildAreaPath(s.data)}
                fill={`url(#area-gradient-${i})`}
              />
            ),
        )}

        {/* Lines */}
        {series.map((s, i) => {
          const color = s.color || CHART_COLORS[i % CHART_COLORS.length]
          return (
            <path
              key={`line-${i}`}
              d={buildLinePath(s.data)}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )
        })}

        {/* Data point dots */}
        {series.map((s, si) => {
          const color = s.color || CHART_COLORS[si % CHART_COLORS.length]
          return s.data.map((d, pi) => (
            <circle
              key={`dot-${si}-${pi}`}
              cx={xPos(pi)}
              cy={yPos(d.value)}
              r={
                activePoint?.seriesIdx === si && activePoint?.pointIdx === pi
                  ? 5
                  : 2.5
              }
              fill={
                activePoint?.seriesIdx === si && activePoint?.pointIdx === pi
                  ? color
                  : 'white'
              }
              stroke={color}
              strokeWidth="2"
            />
          ))
        })}

        {/* X-axis labels */}
        {labels.map((label, i) =>
          i % labelEvery === 0 || i === labels.length - 1 ? (
            <text
              key={i}
              x={xPos(i)}
              y={height - 5}
              textAnchor="middle"
              className="fill-slate-400"
              fontSize="10"
            >
              {label}
            </text>
          ) : null,
        )}

        {/* Invisible hover columns */}
        {labels.map((_, pi) => {
          const colW = plotW / Math.max(pointCount - 1, 1)
          return (
            <rect
              key={`hover-${pi}`}
              x={xPos(pi) - colW / 2}
              y={padTop}
              width={colW}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => {
                // Find which series has the highest value at this point
                let bestSi = 0
                let bestVal = -1
                series.forEach((s, si) => {
                  if (pi < s.data.length && s.data[pi].value > bestVal) {
                    bestVal = s.data[pi].value
                    bestSi = si
                  }
                })
                setActivePoint({ seriesIdx: bestSi, pointIdx: pi })
              }}
              onMouseLeave={() => setActivePoint(null)}
            />
          )
        })}

        {/* Hover tooltip */}
        {activePoint && (() => {
          const { seriesIdx, pointIdx } = activePoint
          const s = series[seriesIdx]
          if (!s || pointIdx >= s.data.length) return null
          const d = s.data[pointIdx]
          const cx = xPos(pointIdx)
          const cy = yPos(d.value)

          return (
            <g>
              {/* Vertical dashed line */}
              <line
                x1={cx}
                y1={padTop}
                x2={cx}
                y2={padTop + plotH}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              {/* Tooltip background */}
              <rect
                x={cx - 45}
                y={cy - 30}
                width={90}
                height={22}
                rx={4}
                fill="#1e293b"
                opacity={0.9}
              />
              {/* Tooltip text */}
              <text
                x={cx}
                y={cy - 15}
                textAnchor="middle"
                fill="white"
                fontSize="11"
                fontWeight="600"
              >
                {series.length > 1
                  ? `${formatValue(d.value)}`
                  : `${d.label}: ${formatValue(d.value)}`}
              </text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}
