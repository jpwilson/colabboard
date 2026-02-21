/**
 * Skeleton loading components for analytics sections.
 * Shown inside Suspense boundaries while async data resolves.
 */

function Shimmer({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />
}

export function StatCardsSkeleton({
  count = 4,
  label,
}: {
  count?: number
  label?: string
}) {
  return (
    <div className="mt-8">
      <Shimmer className="mb-3 h-5 w-40" />
      {label && (
        <p className="mb-3 text-xs text-slate-400">{label}</p>
      )}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <Shimmer className="h-4 w-24" />
            <Shimmer className="mt-3 h-8 w-16" />
            <Shimmer className="mt-3 h-5 w-28" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function LangfuseSkeleton() {
  return (
    <div className="space-y-6">
      {/* Agent Metrics heading + cards */}
      <div className="mt-10">
        <Shimmer className="mb-3 h-5 w-48" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <Shimmer className="h-4 w-24" />
              <Shimmer className="mt-3 h-8 w-20" />
              <Shimmer className="mt-3 h-5 w-28" />
            </div>
          ))}
        </div>
      </div>

      {/* Comparison table skeleton */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Shimmer className="h-5 w-48" />
        <Shimmer className="mt-2 h-4 w-64" />
        <Shimmer className="mt-4 h-6 w-full rounded-full" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Shimmer key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>

      {/* Scores skeleton */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Shimmer className="h-5 w-40" />
        <Shimmer className="mt-2 h-4 w-56" />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-slate-100 p-4"
            >
              <div>
                <Shimmer className="h-4 w-28" />
                <Shimmer className="mt-1 h-3 w-20" />
              </div>
              <Shimmer className="h-7 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CostAnalysisSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-100 p-4">
            <Shimmer className="h-3 w-20" />
            <Shimmer className="mt-2 h-7 w-16" />
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div>
        <Shimmer className="mb-2 h-4 w-32" />
        <Shimmer className="h-48 w-full rounded-lg" />
      </div>

      {/* Table */}
      <div>
        <Shimmer className="mb-2 h-4 w-28" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Shimmer key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function ProjectionsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-slate-50 p-4">
        <Shimmer className="h-3 w-24" />
        <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Shimmer key={i} className="h-5 w-full" />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Shimmer key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}

/** Fade-in wrapper to smooth skeleton→content transition */
export function FadeIn({ children }: { children: React.ReactNode }) {
  return <div className="animate-fadeIn">{children}</div>
}
