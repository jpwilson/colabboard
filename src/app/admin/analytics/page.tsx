import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getAgentBackend, getAgentModel } from '@/lib/supabase/admin'
import {
  getLangfuseTraces,
  getLangfuseScores,
  aggregateScoresByName,
  computeBackendBreakdown,
  computeModelBreakdown,
  computeCommandCounts,
  type LangfuseTrace,
  type LangfuseScore,
} from '@/components/admin/analytics/analytics-data'
import {
  StatCardsSkeleton,
  LangfuseSkeleton,
  FadeIn,
} from '@/components/admin/analytics/skeletons'

export default function AnalyticsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Metrics</h1>
      <p className="mt-1 text-sm text-slate-500">
        Platform activity and AI agent observability
      </p>

      <Suspense
        fallback={<StatCardsSkeleton count={4} label="Loading platform stats..." />}
      >
        <PlatformAndConfigSection />
      </Suspense>

      <Suspense fallback={<LangfuseSkeleton />}>
        <LangfuseSection />
      </Suspense>
    </div>
  )
}

// ── Platform Activity + Config + Langfuse Link ─────────────────────

async function PlatformAndConfigSection() {
  const supabase = await createClient()
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 86400000).toISOString()
  const oneWeekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

  const [
    totalObjectsResult,
    recentObjectsResult,
    weekObjectsResult,
    totalBoardsResult,
    activeBoardsResult,
    backend,
    currentModel,
  ] = await Promise.all([
    supabase
      .from('board_objects')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('board_objects')
      .select('id', { count: 'exact', head: true })
      .gte('updated_at', oneDayAgo),
    supabase
      .from('board_objects')
      .select('id', { count: 'exact', head: true })
      .gte('updated_at', oneWeekAgo),
    supabase.from('boards').select('id', { count: 'exact', head: true }),
    supabase
      .from('boards')
      .select('id', { count: 'exact', head: true })
      .gte('updated_at', oneWeekAgo),
    getAgentBackend(supabase),
    getAgentModel(supabase),
  ])

  const langfuseUrl =
    process.env.LANGFUSE_BASE_URL || 'https://us.cloud.langfuse.com'

  const platformStats = [
    {
      label: 'Total Objects',
      value: totalObjectsResult.count ?? 0,
      sub: 'across all boards',
      color: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Activity (24h)',
      value: recentObjectsResult.count ?? 0,
      sub: 'objects modified',
      color: 'bg-green-50 text-green-700',
    },
    {
      label: 'Activity (7d)',
      value: weekObjectsResult.count ?? 0,
      sub: 'objects modified',
      color: 'bg-purple-50 text-purple-700',
    },
    {
      label: 'Active Boards (7d)',
      value: activeBoardsResult.count ?? 0,
      sub: `of ${totalBoardsResult.count ?? 0} total`,
      color: 'bg-amber-50 text-amber-700',
    },
  ]

  return (
    <FadeIn>
      {/* Platform Stats */}
      <h2 className="mt-8 text-lg font-semibold text-slate-700">
        Platform Activity
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {platformStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">
              {stat.value}
            </p>
            <span
              className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${stat.color}`}
            >
              {stat.sub}
            </span>
          </div>
        ))}
      </div>

      {/* Agent Configuration Summary */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">
          Current Configuration
        </h2>
        <div className="mt-3 flex flex-wrap gap-6 text-sm text-slate-600">
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Backend
            </span>
            <p className="mt-0.5 font-medium text-slate-700">
              {backend === 'nextjs'
                ? 'Vercel AI SDK (Anthropic)'
                : 'Docker (Python/LangChain)'}
            </p>
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Model
            </span>
            <p className="mt-0.5 font-medium text-slate-700">{currentModel}</p>
          </div>
        </div>
      </div>

      {/* Langfuse link */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">
          Langfuse Dashboard
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Full traces with tool calls, token usage, latency, and per-trace
          scores.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <a
            href={langfuseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-primary-dark"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
            Open Langfuse Dashboard
          </a>
          <span className="text-xs text-slate-400">
            Traces enriched with: userId, boardId, command type, backend, model,
            quality scores
          </span>
        </div>
      </div>
    </FadeIn>
  )
}

// ── All Langfuse-dependent content ─────────────────────────────────

const BACKEND_COLORS: Record<string, string> = {
  nextjs: 'bg-blue-500',
  docker: 'bg-amber-500',
}

const MODEL_COLORS: Record<string, string> = {
  'claude-sonnet-4-5': 'bg-violet-500',
  'claude-haiku-4-5': 'bg-teal-500',
}

async function LangfuseSection() {
  const [rawTraces, rawScores] = await Promise.all([
    getLangfuseTraces(),
    getLangfuseScores(),
  ])

  const traces = rawTraces as LangfuseTrace[]
  const scores = rawScores as LangfuseScore[]

  // Agent metrics
  const totalTraces = traces.length
  const tracesWithLatency = traces.filter(
    (t) => typeof t.latency === 'number' && t.latency > 0,
  )
  const avgLatencyMs =
    tracesWithLatency.length > 0
      ? Math.round(
          (tracesWithLatency.reduce((sum, t) => sum + (t.latency ?? 0), 0) /
            tracesWithLatency.length) *
            1000,
        )
      : 0
  const totalCost = traces.reduce((sum, t) => sum + (t.totalCost ?? 0), 0)

  const scoresByName = aggregateScoresByName(scores)
  const toolCallCounts = scoresByName.get('tool_call_count') ?? []
  const totalToolCalls = toolCallCounts.reduce((a, b) => a + b, 0)

  function avgScore(name: string): string {
    const vals = scoresByName.get(name)
    if (!vals || vals.length === 0) return 'N/A'
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
  }

  // Breakdowns
  const backendRows = computeBackendBreakdown(traces, scores)
  const totalBackendTraces = backendRows.reduce((s, r) => s + r.count, 0) || 1

  const modelRows = computeModelBreakdown(traces, scores)
  const totalModelTraces = modelRows.reduce((s, r) => s + r.count, 0) || 1

  const commandCounts = computeCommandCounts(traces)

  const agentStats = [
    {
      label: 'Total Traces',
      value: totalTraces,
      sub: 'AI chat requests',
      color: 'bg-indigo-50 text-indigo-700',
    },
    {
      label: 'Avg Latency',
      value: avgLatencyMs > 0 ? `${avgLatencyMs}ms` : 'N/A',
      sub: 'end-to-end response',
      color: 'bg-cyan-50 text-cyan-700',
    },
    {
      label: 'Total Cost',
      value: totalCost > 0 ? `$${totalCost.toFixed(2)}` : 'N/A',
      sub: 'Anthropic API',
      color: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Tool Calls',
      value: totalToolCalls,
      sub: `across ${toolCallCounts.length} requests`,
      color: 'bg-rose-50 text-rose-700',
    },
  ]

  const scoreMetrics = [
    { name: 'objects_affected', label: 'Avg Objects Affected' },
    { name: 'got_board_state', label: 'Board State Check Rate' },
    { name: 'hit_step_limit', label: 'Step Limit Hit Rate' },
    { name: 'error', label: 'Error Rate' },
    { name: 'latency_ms', label: 'Avg Latency (scored)' },
  ]

  return (
    <FadeIn>
      {/* Agent Stats */}
      <h2 className="mt-10 text-lg font-semibold text-slate-700">
        AI Agent Metrics
        <span className="ml-2 text-xs font-normal text-slate-400">
          from Langfuse
        </span>
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {agentStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">
              {stat.value}
            </p>
            <span
              className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${stat.color}`}
            >
              {stat.sub}
            </span>
          </div>
        ))}
      </div>

      {/* Backend Comparison */}
      {backendRows.length > 0 && (
        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">
            Backend Comparison
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Performance by agent backend
          </p>
          <div className="mt-4 flex h-6 w-full overflow-hidden rounded-full bg-slate-100">
            {backendRows.map((row) => {
              const pct = (row.count / totalBackendTraces) * 100
              return (
                <div
                  key={row.name}
                  style={{ width: `${pct}%` }}
                  className={`${BACKEND_COLORS[row.name] ?? 'bg-slate-400'} flex items-center justify-center text-xs font-medium text-white`}
                  title={`${row.name}: ${row.count} traces (${pct.toFixed(0)}%)`}
                >
                  {pct >= 15 ? `${row.name} ${pct.toFixed(0)}%` : ''}
                </div>
              )
            })}
          </div>
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
                {backendRows.map((row) => (
                  <tr key={row.name} className="border-b border-slate-50">
                    <td className="py-3 pr-4 font-medium text-slate-800">
                      <span className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${BACKEND_COLORS[row.name] ?? 'bg-slate-400'}`}
                        />
                        {row.name === 'nextjs'
                          ? 'Vercel AI SDK'
                          : row.name === 'docker'
                            ? 'Docker (Python)'
                            : row.name}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-700">
                      {row.count}
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-700">
                      {row.avgLatencyMs > 0 ? `${row.avgLatencyMs}ms` : 'N/A'}
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-700">
                      {row.totalCost > 0
                        ? `$${row.totalCost.toFixed(3)}`
                        : 'N/A'}
                    </td>
                    <td className="py-3 text-right text-slate-700">
                      {(row.errorRate * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Model Comparison */}
      {modelRows.length > 0 && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">
            Model Comparison
          </h2>
          <p className="mt-1 text-sm text-slate-500">Performance by AI model</p>
          <div className="mt-4 flex h-6 w-full overflow-hidden rounded-full bg-slate-100">
            {modelRows.map((row) => {
              const pct = (row.count / totalModelTraces) * 100
              return (
                <div
                  key={row.name}
                  style={{ width: `${pct}%` }}
                  className={`${MODEL_COLORS[row.name] ?? 'bg-slate-400'} flex items-center justify-center text-xs font-medium text-white`}
                  title={`${row.name}: ${row.count} traces (${pct.toFixed(0)}%)`}
                >
                  {pct >= 20
                    ? `${row.name.replace('claude-', '')} ${pct.toFixed(0)}%`
                    : ''}
                </div>
              )
            })}
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Model</th>
                  <th className="py-2 pr-4 text-right">Traces</th>
                  <th className="py-2 pr-4 text-right">Avg Latency</th>
                  <th className="py-2 pr-4 text-right">Total Cost</th>
                  <th className="py-2 text-right">Error Rate</th>
                </tr>
              </thead>
              <tbody>
                {modelRows.map((row) => (
                  <tr key={row.name} className="border-b border-slate-50">
                    <td className="py-3 pr-4 font-medium text-slate-800">
                      <span className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${MODEL_COLORS[row.name] ?? 'bg-slate-400'}`}
                        />
                        {row.name}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-700">
                      {row.count}
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-700">
                      {row.avgLatencyMs > 0 ? `${row.avgLatencyMs}ms` : 'N/A'}
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-700">
                      {row.totalCost > 0
                        ? `$${row.totalCost.toFixed(3)}`
                        : 'N/A'}
                    </td>
                    <td className="py-3 text-right text-slate-700">
                      {(row.errorRate * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scores Summary */}
      {scores.length > 0 && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">
            Agent Quality Scores
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Programmatic scores attached to each trace
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scoreMetrics.map(({ name, label }) => {
              const avg = avgScore(name)
              const count = scoresByName.get(name)?.length ?? 0
              return (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {label}
                    </p>
                    <p className="text-xs text-slate-400">
                      {count} measurement{count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{avg}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Command Distribution */}
      {commandCounts.size > 0 && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">
            Command Distribution
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Types of commands sent to the agent
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {[...commandCounts.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([cmd, count]) => (
                <div
                  key={cmd}
                  className="rounded-lg border border-slate-100 px-4 py-2 text-center"
                >
                  <p className="text-lg font-bold text-slate-800">{count}</p>
                  <p className="text-xs text-slate-500">{cmd}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </FadeIn>
  )
}
