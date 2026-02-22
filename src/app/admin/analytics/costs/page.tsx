import { Suspense } from 'react'
import {
  getLangfuseTraces,
  getLangfuseObservations,
  computeModelUsage,
  computeDailyData,
  computeDailyCostByModel,
  computeUserConsumption,
  type LangfuseTrace,
  type LangfuseObservation,
} from '@/components/admin/analytics/analytics-data'
import {
  CostAnalysisSkeleton,
  FadeIn,
} from '@/components/admin/analytics/skeletons'
import { SvgLineChart } from '@/components/admin/analytics/SvgLineChart'
import type { ChartSeries } from '@/components/admin/analytics/SvgLineChart'

const CHART_COLORS = [
  '#6366f1', // indigo
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
]

export default function CostAnalysisPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Cost Analysis</h1>
      <p className="mt-1 text-sm text-slate-500">
        Token usage, model costs, and per-user consumption
      </p>

      <Suspense fallback={<CostAnalysisSkeleton />}>
        <CostAnalysisContent />
      </Suspense>
    </div>
  )
}

async function CostAnalysisContent() {
  const [rawTraces, rawObservations] = await Promise.all([
    getLangfuseTraces(),
    getLangfuseObservations(),
  ])

  const traces = rawTraces as LangfuseTrace[]
  const observations = rawObservations as LangfuseObservation[]

  // Computations
  const modelUsage = computeModelUsage(observations)
  const dailyData = computeDailyData(traces)
  const dailyCostByModel = computeDailyCostByModel(observations)
  const userConsumption = computeUserConsumption(traces)

  const totalCost = traces.reduce((sum, t) => sum + (t.totalCost ?? 0), 0)
  const totalInputTokens = modelUsage.reduce((s, r) => s + r.input, 0)
  const totalOutputTokens = modelUsage.reduce((s, r) => s + r.output, 0)
  const totalTokens = totalInputTokens + totalOutputTokens
  const hasTokenData = totalTokens > 0
  const avgCostPerTrace =
    traces.length > 0 ? totalCost / traces.length : 0

  // KPI cards
  const kpis = [
    {
      label: 'Total Cost',
      value: totalCost > 0 ? `$${totalCost.toFixed(2)}` : 'N/A',
    },
    {
      label: 'Avg Cost / Request',
      value: avgCostPerTrace > 0 ? `$${avgCostPerTrace.toFixed(4)}` : 'N/A',
    },
    {
      label: 'Input Tokens',
      value: hasTokenData ? totalInputTokens.toLocaleString() : 'N/A',
    },
    {
      label: 'Output Tokens',
      value: hasTokenData ? totalOutputTokens.toLocaleString() : 'N/A',
    },
  ]

  // Build chart series: traces over time
  const tracesSeries: ChartSeries[] = [
    {
      name: 'Traces',
      color: '#6366f1',
      data: dailyData.map((d) => ({
        label: d.date.slice(5), // MM-DD
        value: d.count,
      })),
    },
  ]

  // Build chart series: cost over time (single line)
  const costSeries: ChartSeries[] = [
    {
      name: 'Cost ($)',
      color: '#10b981',
      data: dailyData.map((d) => ({
        label: d.date.slice(5),
        value: d.cost,
      })),
    },
  ]

  // Build chart series: cost by model over time (multi-series)
  const modelNames = [...new Set(dailyCostByModel.map((r) => r.model))].filter(
    (m) => m !== 'unknown',
  )
  const dates = [...new Set(dailyCostByModel.map((r) => r.date))].sort()
  const modelCostSeries: ChartSeries[] = modelNames.map((model, i) => ({
    name: model.replace('claude-', ''),
    color: CHART_COLORS[i % CHART_COLORS.length],
    data: dates.map((date) => ({
      label: date.slice(5),
      value:
        dailyCostByModel.find((r) => r.date === date && r.model === model)
          ?.cost ?? 0,
    })),
  }))

  // Max consumption for bar widths
  const maxUserCost = Math.max(...userConsumption.map((u) => u.cost), 0.001)

  return (
    <FadeIn>
      {/* Rate limit warning */}
      {!hasTokenData && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-medium">Note:</span> Token-level data may be
          unavailable due to Langfuse hobby plan rate limits. Upgrade for full
          token analytics.
        </div>
      )}

      {/* KPI Cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {kpi.label}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-800">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Traces + Cost charts side by side on large viewports */}
      {dailyData.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">
              Traces Over Time
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Daily AI agent request volume
            </p>
            <div className="mt-4">
              <SvgLineChart series={tracesSeries} height={220} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">
              Cost Over Time
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Daily LLM API spend
            </p>
            <div className="mt-4">
              <SvgLineChart series={costSeries} height={220} yLabel="$" />
            </div>
          </div>
        </div>
      )}

      {/* Cost by model over time */}
      {modelCostSeries.length > 0 && dates.length > 1 && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">
            Cost by Model
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Daily cost breakdown per model
          </p>
          <div className="mt-4">
            <SvgLineChart
              series={modelCostSeries}
              height={220}
              yLabel="$"
            />
          </div>
        </div>
      )}

      {/* Model Usage Table */}
      {modelUsage.length > 0 && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
                {modelUsage.map((row) => (
                  <tr key={row.model} className="border-b border-slate-50">
                    <td className="py-3 pr-4 font-medium text-slate-800">
                      {row.model}
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-700">
                      {row.traces}
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-700">
                      {row.input > 0 ? row.input.toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-700">
                      {row.output > 0 ? row.output.toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3 text-right font-medium text-slate-800">
                      {row.cost > 0 ? `$${row.cost.toFixed(4)}` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Consumption */}
      {userConsumption.length > 0 && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">
            User Consumption
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Top 10 users by cost
          </p>
          <div className="mt-4 space-y-2">
            {userConsumption.map((row) => (
              <div key={row.user} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-xs font-mono text-slate-500">
                  {row.user}
                </span>
                <div className="flex-1">
                  <div
                    className="h-6 rounded bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all"
                    style={{
                      width: `${Math.max((row.cost / maxUserCost) * 100, 2)}%`,
                    }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-xs font-medium text-slate-700">
                  ${row.cost.toFixed(4)}
                </span>
                <span className="w-16 shrink-0 text-right text-xs text-slate-400">
                  {row.traces} req
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Infrastructure Costs */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">
          Other Infrastructure Costs
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Current platform services
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              name: 'Supabase',
              plan: 'Free tier',
              cost: '$0/mo',
              color: 'bg-emerald-50 text-emerald-700',
            },
            {
              name: 'Vercel',
              plan: 'Hobby',
              cost: '$0/mo',
              color: 'bg-slate-50 text-slate-700',
            },
            {
              name: 'Langfuse',
              plan: 'Hobby',
              cost: '$0/mo',
              color: 'bg-amber-50 text-amber-700',
            },
          ].map((svc) => (
            <div
              key={svc.name}
              className="flex items-center justify-between rounded-lg border border-slate-100 p-4"
            >
              <div>
                <p className="font-medium text-slate-800">{svc.name}</p>
                <p className="text-xs text-slate-400">{svc.plan}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${svc.color}`}
              >
                {svc.cost}
              </span>
            </div>
          ))}
        </div>
      </div>
    </FadeIn>
  )
}
