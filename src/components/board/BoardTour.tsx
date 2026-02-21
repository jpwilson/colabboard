'use client'

import { useState, useEffect } from 'react'

const TOUR_STEPS = [
  {
    target: '[data-tour-step="select"]',
    title: 'Select Tool',
    content: 'Click objects to select them. Hold Shift to multi-select, or Shift+drag to marquee-select.',
  },
  {
    target: '[data-tour-step="sticky"]',
    title: 'Sticky Notes',
    content: 'Create sticky notes in any color. Double-click to edit text. Use the dropdown to pick a color.',
  },
  {
    target: '[data-tour-step="shapes"]',
    title: 'Shapes',
    content: 'Choose from 11 shape types — rectangles, circles, stars, arrows, and more. Use the dropdown to browse.',
  },
  {
    target: '[data-tour-step="freedraw"]',
    title: 'Free Draw',
    content: 'Draw freehand on the canvas. Click and drag to sketch, release to finish.',
  },
  {
    target: '[data-tour-step="grid"]',
    title: 'Grid Toggle',
    content: 'Switch between no grid, dots, or gridlines. Click to cycle through options.',
  },
  {
    target: '[data-tour-step="share"]',
    title: 'Share Board',
    content: 'Invite collaborators by email or share a join link. Set permissions for each person.',
  },
  {
    target: '[data-tour-step="ai-hub"]',
    title: 'AI Agent',
    content: 'Click the alien to open the AI hub. Ask it to create templates, arrange objects, or modify your board.',
  },
]

interface BoardTourProps {
  onClose: () => void
}

export function BoardTour({ onClose }: BoardTourProps) {
  const [step, setStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    const measure = () => {
      const selector = TOUR_STEPS[step]?.target
      if (!selector) return
      const el = document.querySelector(selector)
      setTargetRect(el ? el.getBoundingClientRect() : null)
    }

    // Defer initial measurement to avoid synchronous setState in effect body
    const frame = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
    }
  }, [step])

  const currentStep = TOUR_STEPS[step]
  const isLast = step === TOUR_STEPS.length - 1

  // Position tooltip near the target
  const tooltipStyle: React.CSSProperties = {}
  if (targetRect) {
    const padding = 12
    // Place tooltip below the target by default
    tooltipStyle.position = 'fixed'
    tooltipStyle.left = Math.max(16, Math.min(targetRect.left, window.innerWidth - 300))
    tooltipStyle.top = targetRect.bottom + padding

    // If it would go off-screen bottom, place above
    if (tooltipStyle.top as number > window.innerHeight - 200) {
      tooltipStyle.top = targetRect.top - padding - 160
    }
  } else {
    // Center if no target found
    tooltipStyle.position = 'fixed'
    tooltipStyle.left = '50%'
    tooltipStyle.top = '50%'
    tooltipStyle.transform = 'translate(-50%, -50%)'
  }

  return (
    <div className="fixed inset-0 z-[10001]">
      {/* Semi-transparent overlay with cutout */}
      <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 4}
                y={targetRect.top - 4}
                width={targetRect.width + 8}
                height={targetRect.height + 8}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.4)" mask="url(#tour-mask)" />
      </svg>

      {/* Highlight border around target */}
      {targetRect && (
        <div
          className="absolute rounded-lg border-2 border-primary shadow-lg shadow-primary/20"
          style={{
            left: targetRect.left - 4,
            top: targetRect.top - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Click catcher (dismiss on click outside tooltip) */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Tooltip */}
      <div
        className="z-10 w-72 rounded-xl border border-white/30 bg-white p-4 shadow-2xl"
        style={tooltipStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step counter */}
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Step {step + 1} of {TOUR_STEPS.length}
          </span>
          <button
            onClick={onClose}
            className="rounded p-0.5 text-slate-400 transition hover:text-slate-600"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <h3 className="mb-1 text-sm font-bold text-slate-800">{currentStep.title}</h3>
        <p className="mb-3 text-xs leading-relaxed text-slate-500">{currentStep.content}</p>

        {/* Progress dots */}
        <div className="mb-3 flex justify-center gap-1">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-4 bg-primary' : i < step ? 'w-1.5 bg-primary/40' : 'w-1.5 bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 transition hover:text-slate-600"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Back
              </button>
            )}
            <button
              onClick={() => {
                if (isLast) onClose()
                else setStep(step + 1)
              }}
              className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-slate-800 transition hover:bg-primary-dark"
            >
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
