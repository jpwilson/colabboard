/**
 * Skeleton loading components for analytics sections.
 * Show real page structure (headings, labels, chart frames) with placeholder
 * values and an "Updating..." badge so the page feels instant.
 */

function Shimmer({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />
}

function UpdatingBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
      Updating...
    </span>
  )
}

export function StatCardsSkeleton({
  count = 4,
  label,
}: {
  count?: number
  label?: string
}) {
  const placeholderLabels = [
    'Total Objects',
    'Activity (24h)',
    'Activity (7d)',
    'Active Boards (7d)',
  ]
  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-700">
          Platform Activity
        </h2>
        <UpdatingBadge />
      </div>
      {label && <p className="mb-3 text-xs text-slate-400">{label}</p>}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">
              {placeholderLabels[i] ?? `Metric ${i + 1}`}
            </p>
            <Shimmer className="mt-3 h-8 w-16" />
            <Shimmer className="mt-3 h-5 w-28" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function LangfuseSkeleton() {
  const agentLabels = ['Total Traces', 'Avg Latency', 'Total Cost', 'Tool Calls']
  return (
    <div className="space-y-6">
      {/* Agent Metrics */}
      <div className="mt-10">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-700">
            AI Agent Metrics
          </h2>
          <span className="text-xs font-normal text-slate-400">
            from Langfuse
          </span>
          <UpdatingBadge />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {agentLabels.map((label) => (
            <div
              key={label}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <Shimmer className="mt-3 h-8 w-20" />
              <Shimmer className="mt-3 h-5 w-28" />
            </div>
          ))}
        </div>
      </div>

      {/* Backend Comparison */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">
          Backend Comparison
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Performance by agent backend
        </p>
        <Shimmer className="mt-4 h-6 w-full rounded-full" />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Backend</th>
                <th className="py-2 pr-4 text-right">Traces</th>
                <th className="py-2 pr-4 text-right">Avg Latency</th>
                <th className="py-2 pr-4 text-right">Total Cost</th>
                <th className="py-2 text-right">Error Rate</th>
              </tr>
            </thead>
            <tbody>
              {['Vercel AI SDK', 'Docker (Python)'].map((name) => (
                <tr key={name} className="border-b border-slate-50">
                  <td className="py-3 pr-4 font-medium text-slate-800">
                    {name}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <Shimmer className="ml-auto h-4 w-8" />
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <Shimmer className="ml-auto h-4 w-12" />
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <Shimmer className="ml-auto h-4 w-12" />
                  </td>
                  <td className="py-3 text-right">
                    <Shimmer className="ml-auto h-4 w-10" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scores */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">
          Agent Quality Scores
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Programmatic scores attached to each trace
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            'Avg Objects Affected',
            'Board State Check Rate',
            'Step Limit Hit Rate',
            'Error Rate',
            'Avg Latency (scored)',
          ].map((label) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-lg border border-slate-100 p-4"
            >
              <div>
                <p className="text-sm font-medium text-slate-700">{label}</p>
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
  const kpiLabels = [
    'Total Cost',
    'Avg Cost / Request',
    'Input Tokens',
    'Output Tokens',
  ]
  return (
    <div className="space-y-6">
      {/* KPI cards with real labels */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {kpiLabels.map((label) => (
          <div
            key={label}
            className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {label}
            </p>
            <Shimmer className="mt-2 h-7 w-16" />
          </div>
        ))}
      </div>

      {/* Two charts side by side */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Traces Over Time
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Daily AI agent request volume
              </p>
            </div>
            <UpdatingBadge />
          </div>
          <Shimmer className="mt-4 h-52 w-full rounded-lg" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Cost Over Time
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Daily LLM API spend
              </p>
            </div>
            <UpdatingBadge />
          </div>
          <Shimmer className="mt-4 h-52 w-full rounded-lg" />
        </div>
      </div>

      {/* Model Usage Table with headers */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">
          Model Usage Breakdown
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Token usage and cost per model
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Model</th>
                <th className="py-2 pr-4 text-right">Generations</th>
                <th className="py-2 pr-4 text-right">Input Tokens</th>
                <th className="py-2 pr-4 text-right">Output Tokens</th>
                <th className="py-2 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 2 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="py-3 pr-4">
                    <Shimmer className="h-4 w-32" />
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <Shimmer className="ml-auto h-4 w-8" />
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <Shimmer className="ml-auto h-4 w-14" />
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <Shimmer className="ml-auto h-4 w-14" />
                  </td>
                  <td className="py-3 text-right">
                    <Shimmer className="ml-auto h-4 w-12" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Consumption */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">
          User Consumption
        </h2>
        <p className="mt-1 text-sm text-slate-500">Top 10 users by cost</p>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Shimmer className="h-4 w-28 shrink-0" />
              <Shimmer className="h-6 flex-1 rounded" />
              <Shimmer className="h-4 w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ProjectionsSkeleton() {
  const assumptionLabels = [
    'Avg Cost / Request',
    'Avg Input Tokens',
    'Avg Output Tokens',
    'Sessions / User / Mo',
    'Commands / Session',
    'Commands / User / Mo',
  ]
  return (
    <div className="space-y-6">
      {/* Assumptions with real labels */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-800">Assumptions</h2>
          <UpdatingBadge />
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Based on observed usage patterns
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {assumptionLabels.map((label) => (
            <div key={label} className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-400">{label}</p>
              <Shimmer className="mt-2 h-5 w-14" />
            </div>
          ))}
        </div>
      </div>

      {/* Projections table with real headers */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">
          Cost Projections by Scale
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Monthly cost estimates at different user tiers
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Users</th>
                <th className="py-2 pr-4 text-right">Commands / Mo</th>
                <th className="py-2 pr-4 text-right">LLM Cost</th>
                <th className="py-2 pr-4 text-right">Infra Cost</th>
                <th className="py-2 pr-4 text-right">Total / Mo</th>
                <th className="py-2">Infrastructure Notes</th>
              </tr>
            </thead>
            <tbody>
              {['100', '1,000', '10,000', '100,000'].map((users) => (
                <tr key={users} className="border-b border-slate-50">
                  <td className="py-3 pr-4 font-bold text-slate-800">
                    {users}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <Shimmer className="ml-auto h-4 w-14" />
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <Shimmer className="ml-auto h-4 w-10" />
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <Shimmer className="ml-auto h-4 w-10" />
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <Shimmer className="ml-auto h-4 w-12" />
                  </td>
                  <td className="py-3">
                    <Shimmer className="h-4 w-40" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Optimization Notes */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">
          Optimization Opportunities
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Strategies to reduce costs at scale
        </p>
        <div className="mt-4 space-y-3">
          {['Prompt Caching', 'Model Tiering', 'Response Streaming', 'Rate Limiting'].map(
            (title) => (
              <div
                key={title}
                className="flex items-start gap-4 rounded-lg border border-slate-100 p-4"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{title}</p>
                  <Shimmer className="mt-1 h-4 w-3/4" />
                </div>
                <Shimmer className="h-5 w-12 shrink-0 rounded-full" />
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  )
}

/** Fade-in wrapper to smooth skeleton→content transition */
export function FadeIn({ children }: { children: React.ReactNode }) {
  return <div className="animate-fadeIn">{children}</div>
}
