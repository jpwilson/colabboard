import { createClient } from '@/lib/supabase/server'
import { getAgentBackend, getAgentModel } from '@/lib/supabase/admin'
import {
  fetchTraces,
  fetchScores,
  fetchDailyMetrics,
} from '@/lib/ai/langfuse-scores'
import type { DailyMetric } from '@/lib/ai/langfuse-scores'

function getTimeRanges() {
  const now = Date.now()
  return {
    oneDayAgo: new Date(now - 86400000).toISOString(),
    oneWeekAgo: new Date(now - 7 * 86400000).toISOString(),
  }
}

interface LangfuseTrace {
  id: string
  name?: string
  latency?: number
  totalCost?: number
  tags?: string[]
  metadata?: Record<string, unknown>
  createdAt?: string
}

interface LangfuseScore {
  traceId: string
  name: string
  value: number
}

interface GroupStats {
  count: number
  avgLatencyMs: number
  totalCost: number
  errorRate: number
}

function computeGroupStats(
  groupTraces: LangfuseTrace[],
  groupScores: LangfuseScore[],
): GroupStats {
  const count = groupTraces.length
  const withLatency = groupTraces.filter(
    (t) => typeof t.latency === 'number' && t.latency > 0,
  )
  const avgLatencyMs =
    withLatency.length > 0
      ? Math.round(
          withLatency.reduce((sum, t) => sum + (t.latency ?? 0), 0) /
            withLatency.length,
        )
      : 0
  const totalCost = groupTraces.reduce(
    (sum, t) => sum + (t.totalCost ?? 0),
    0,
  )
  const errorScores = groupScores.filter((s) => s.name === 'error')
  const errorRate =
    errorScores.length > 0
      ? errorScores.filter((s) => s.value > 0).length / errorScores.length
      : 0

  return { count, avgLatencyMs, totalCost, errorRate }
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { oneDayAgo, oneWeekAgo } = getTimeRanges()

  // Fetch platform stats + Langfuse data in parallel
  const [
    totalObjectsResult,
    recentObjectsResult,
    weekObjectsResult,
    totalBoardsResult,
    activeBoardsResult,
    backend,
    currentModel,
    langfuseTraces,
    langfuseScoresData,
    dailyMetrics,
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
    fetchTraces({ limit: 100, name: 'ai-chat' }),
    fetchScores({ limit: 500 }),
    fetchDailyMetrics({ traceName: 'ai-chat', limit: 90 }),
  ])

  const traces = langfuseTraces as LangfuseTrace[]
  const scores = langfuseScoresData as LangfuseScore[]

  // Compute Langfuse metrics
  const totalTraces = traces.length
  const tracesWithLatency = traces.filter(
    (t) => typeof t.latency === 'number' && t.latency > 0,
  )
  const avgLatencyMs =
    tracesWithLatency.length > 0
      ? Math.round(
          tracesWithLatency.reduce((sum, t) => sum + (t.latency ?? 0), 0) /
            tracesWithLatency.length,
        )
      : 0
  const totalCost = traces.reduce((sum, t) => sum + (t.totalCost ?? 0), 0)

  // Aggregate scores by name
  const scoresByName = new Map<string, number[]>()
  for (const s of scores) {
    const arr = scoresByName.get(s.name) ?? []
    arr.push(s.value)
    scoresByName.set(s.name, arr)
  }

  function avgScore(name: string): string {
    const vals = scoresByName.get(name)
    if (!vals || vals.length === 0) return 'N/A'
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
  }

  // Command type distribution from tags
  const commandCounts = new Map<string, number>()
  for (const t of traces) {
    const cmdTag = t.tags?.find((tag) => tag.startsWith('command:'))
    if (cmdTag) {
      const cmd = cmdTag.replace('command:', '')
      commandCounts.set(cmd, (commandCounts.get(cmd) ?? 0) + 1)
    }
  }

  // Tool usage from scores
  const toolCallCounts = scoresByName.get('tool_call_count') ?? []
  const totalToolCalls = toolCallCounts.reduce((a, b) => a + b, 0)

  // --- Per-backend breakdown ---
  const tracesByBackend = new Map<string, LangfuseTrace[]>()
  const traceBackendMap = new Map<string, string>()
  for (const t of traces) {
    const backendTag = t.tags?.find((tag) => tag.startsWith('backend:'))
    const b = backendTag?.replace('backend:', '') ?? 'unknown'
    traceBackendMap.set(t.id, b)
    if (!tracesByBackend.has(b)) tracesByBackend.set(b, [])
    tracesByBackend.get(b)!.push(t)
  }

  const scoresByBackend = new Map<string, LangfuseScore[]>()
  for (const s of scores) {
    const b = traceBackendMap.get(s.traceId) ?? 'unknown'
    if (!scoresByBackend.has(b)) scoresByBackend.set(b, [])
    scoresByBackend.get(b)!.push(s)
  }

  const backendRows = [...tracesByBackend.entries()]
    .filter(([key]) => key !== 'unknown')
    .map(([name, groupTraces]) => ({
      name,
      ...computeGroupStats(groupTraces, scoresByBackend.get(name) ?? []),
    }))
    .sort((a, b) => b.count - a.count)

  const totalBackendTraces = backendRows.reduce((s, r) => s + r.count, 0) || 1

  // --- Per-model breakdown ---
  const tracesByModel = new Map<string, LangfuseTrace[]>()
  const traceModelMap = new Map<string, string>()
  for (const t of traces) {
    const modelTag = t.tags?.find((tag) => tag.startsWith('model:'))
    const m = modelTag?.replace('model:', '') ?? 'unknown'
    traceModelMap.set(t.id, m)
    if (!tracesByModel.has(m)) tracesByModel.set(m, [])
    tracesByModel.get(m)!.push(t)
  }

  const scoresByModel = new Map<string, LangfuseScore[]>()
  for (const s of scores) {
    const m = traceModelMap.get(s.traceId) ?? 'unknown'
    if (!scoresByModel.has(m)) scoresByModel.set(m, [])
    scoresByModel.get(m)!.push(s)
  }

  const modelRows = [...tracesByModel.entries()]
    .filter(([key]) => key !== 'unknown')
    .map(([name, groupTraces]) => ({
      name,
      ...computeGroupStats(groupTraces, scoresByModel.get(name) ?? []),
    }))
    .sort((a, b) => b.count - a.count)

  const totalModelTraces = modelRows.reduce((s, r) => s + r.count, 0) || 1

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

  const BACKEND_COLORS: Record<string, string> = {
    nextjs: 'bg-blue-500',
    docker: 'bg-amber-500',
  }

  const MODEL_COLORS: Record<string, string> = {
    'claude-sonnet-4-5': 'bg-violet-500',
    'claude-haiku-4-5': 'bg-teal-500',
  }

  // --- Cost Analysis from Daily Metrics ---
  const metrics = dailyMetrics as DailyMetric[]
  const metricsTotalCost = metrics.reduce((s, d) => s + d.totalCost, 0)
  const metricsTotalTraces = metrics.reduce((s, d) => s + d.countTraces, 0)

  // Aggregate token usage across all days and models
  const modelUsageMap = new Map<
    string,
    { input: number; output: number; total: number; cost: number; traces: number }
  >()
  for (const day of metrics) {
    for (const u of day.usage) {
      const existing = modelUsageMap.get(u.model) ?? {
        input: 0,
        output: 0,
        total: 0,
        cost: 0,
        traces: 0,
      }
      existing.input += u.inputUsage
      existing.output += u.outputUsage
      existing.total += u.totalUsage
      existing.cost += u.totalCost
      existing.traces += u.countTraces
      modelUsageMap.set(u.model, existing)
    }
  }
  const totalInputTokens = [...modelUsageMap.values()].reduce(
    (s, v) => s + v.input,
    0,
  )
  const totalOutputTokens = [...modelUsageMap.values()].reduce(
    (s, v) => s + v.output,
    0,
  )
  const totalTokens = totalInputTokens + totalOutputTokens

  // Per-request averages for projections
  const avgCostPerRequest =
    metricsTotalTraces > 0 ? metricsTotalCost / metricsTotalTraces : 0.009
  const avgInputPerRequest =
    metricsTotalTraces > 0 ? totalInputTokens / metricsTotalTraces : 2000
  const avgOutputPerRequest =
    metricsTotalTraces > 0 ? totalOutputTokens / metricsTotalTraces : 600

  // Projection assumptions
  const COMMANDS_PER_SESSION = 5
  const SESSIONS_PER_MONTH = 10
  const COMMANDS_PER_USER_PER_MONTH = COMMANDS_PER_SESSION * SESSIONS_PER_MONTH

  const projectionTiers = [
    { users: 100, infraNote: 'Free tier covers most infra' },
    {
      users: 1_000,
      infraNote: 'Supabase Pro ($25) + Vercel Pro ($20)',
    },
    {
      users: 10_000,
      infraNote: 'Add caching & rate limiting',
    },
    {
      users: 100_000,
      infraNote: 'Prompt caching + model tiering critical',
    },
  ].map((tier) => {
    const monthlyCommands = tier.users * COMMANDS_PER_USER_PER_MONTH
    const llmCost = monthlyCommands * avgCostPerRequest
    const infraCost =
      tier.users <= 100
        ? 0
        : tier.users <= 1_000
          ? 45
          : tier.users <= 10_000
            ? 100
            : 200
    return {
      ...tier,
      monthlyCommands,
      llmCost,
      infraCost,
      totalCost: llmCost + infraCost,
    }
  })

  const modelUsageRows = [...modelUsageMap.entries()]
    .map(([model, usage]) => ({ model, ...usage }))
    .sort((a, b) => b.cost - a.cost)

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
      <p className="mt-1 text-sm text-slate-500">
        Platform activity and AI agent observability
      </p>

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

      {/* Agent Stats from Langfuse */}
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

      {/* AI Cost Analysis — Development & Testing */}
      <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">
          AI Cost Analysis
          <span className="ml-2 text-xs font-normal text-slate-400">
            Development &amp; Testing
          </span>
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Actual LLM spend tracked via Langfuse Daily Metrics API
        </p>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-100 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              LLM API Cost
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-800">
              {metricsTotalCost > 0
                ? `$${metricsTotalCost.toFixed(2)}`
                : 'N/A'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              API Calls
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-800">
              {metricsTotalTraces}
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Input Tokens
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-800">
              {totalInputTokens > 0
                ? totalInputTokens.toLocaleString()
                : 'N/A'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Output Tokens
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-800">
              {totalOutputTokens > 0
                ? totalOutputTokens.toLocaleString()
                : 'N/A'}
            </p>
          </div>
        </div>

        {/* Cost per model */}
        {modelUsageRows.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <h3 className="mb-2 text-sm font-semibold text-slate-600">
              Cost by Model
            </h3>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Model</th>
                  <th className="py-2 pr-4 text-right">Traces</th>
                  <th className="py-2 pr-4 text-right">Input Tokens</th>
                  <th className="py-2 pr-4 text-right">Output Tokens</th>
                  <th className="py-2 text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {modelUsageRows.map((row) => (
                  <tr
                    key={row.model}
                    className="border-b border-slate-50"
                  >
                    <td className="py-2 pr-4 font-medium text-slate-700">
                      {row.model}
                    </td>
                    <td className="py-2 pr-4 text-right text-slate-600">
                      {row.traces}
                    </td>
                    <td className="py-2 pr-4 text-right text-slate-600">
                      {row.input.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-right text-slate-600">
                      {row.output.toLocaleString()}
                    </td>
                    <td className="py-2 text-right font-medium text-slate-700">
                      ${row.cost.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Other costs */}
        <div className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="font-medium text-slate-700">Observability</p>
            <p className="text-xs text-slate-500">Langfuse free tier</p>
            <p className="mt-1 text-lg font-bold text-green-600">$0</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="font-medium text-slate-700">Hosting</p>
            <p className="text-xs text-slate-500">Vercel hobby plan</p>
            <p className="mt-1 text-lg font-bold text-green-600">$0</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="font-medium text-slate-700">Database</p>
            <p className="text-xs text-slate-500">Supabase free tier</p>
            <p className="mt-1 text-lg font-bold text-green-600">$0</p>
          </div>
        </div>
      </div>

      {/* Production Cost Projections */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">
          Production Cost Projections
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Monthly estimates based on actual per-request averages from Langfuse
        </p>

        {/* Assumptions */}
        <div className="mt-4 rounded-lg bg-slate-50 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Assumptions
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-slate-600 sm:grid-cols-4">
            <div>
              <span className="text-slate-400">Commands/session:</span>{' '}
              {COMMANDS_PER_SESSION}
            </div>
            <div>
              <span className="text-slate-400">Sessions/user/month:</span>{' '}
              {SESSIONS_PER_MONTH}
            </div>
            <div>
              <span className="text-slate-400">Avg input tokens:</span>{' '}
              {Math.round(avgInputPerRequest).toLocaleString()}
            </div>
            <div>
              <span className="text-slate-400">Avg output tokens:</span>{' '}
              {Math.round(avgOutputPerRequest).toLocaleString()}
            </div>
            <div>
              <span className="text-slate-400">Avg cost/request:</span> $
              {avgCostPerRequest.toFixed(4)}
            </div>
            <div>
              <span className="text-slate-400">Total tokens tracked:</span>{' '}
              {totalTokens.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Projections table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Scale</th>
                <th className="py-2 pr-4 text-right">Monthly Commands</th>
                <th className="py-2 pr-4 text-right">LLM Cost</th>
                <th className="py-2 pr-4 text-right">Infra Cost</th>
                <th className="py-2 text-right">Total/Month</th>
              </tr>
            </thead>
            <tbody>
              {projectionTiers.map((tier) => (
                <tr
                  key={tier.users}
                  className="border-b border-slate-50"
                >
                  <td className="py-3 pr-4 font-medium text-slate-800">
                    {tier.users.toLocaleString()} users
                  </td>
                  <td className="py-3 pr-4 text-right text-slate-700">
                    {tier.monthlyCommands.toLocaleString()}
                  </td>
                  <td className="py-3 pr-4 text-right text-slate-700">
                    ${tier.llmCost < 1 ? tier.llmCost.toFixed(2) : Math.round(tier.llmCost).toLocaleString()}
                  </td>
                  <td className="py-3 pr-4 text-right text-slate-700">
                    ${tier.infraCost}
                  </td>
                  <td className="py-3 text-right font-bold text-slate-800">
                    ${tier.totalCost < 1 ? tier.totalCost.toFixed(2) : `~${Math.round(tier.totalCost).toLocaleString()}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Notes */}
        <p className="mt-3 text-xs text-slate-400">
          Infrastructure: Supabase Pro ($25), Vercel Pro ($20), Langfuse
          ($0-59), Railway ($5+). LLM cost dominates at scale — optimize via
          prompt caching, model tiering (Haiku for simple tasks), and rate
          limiting.
        </p>
      </div>

      {/* Backend Comparison */}
      {backendRows.length > 0 && (
        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">
            Backend Comparison
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Performance by agent backend
            <span className="ml-1 text-xs text-slate-400">
              (active: {backend === 'nextjs' ? 'Vercel AI SDK' : 'Docker'})
            </span>
          </p>

          {/* Distribution bar */}
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

          {/* Comparison table */}
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
                  <tr
                    key={row.name}
                    className="border-b border-slate-50"
                  >
                    <td className="py-3 pr-4 font-medium text-slate-800">
                      <span className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${BACKEND_COLORS[row.name] ?? 'bg-slate-400'}`}
                        />
                        {row.name === 'nextjs' ? 'Vercel AI SDK' : row.name === 'docker' ? 'Docker (Python)' : row.name}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-700">
                      {row.count}
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-700">
                      {row.avgLatencyMs > 0 ? `${row.avgLatencyMs}ms` : 'N/A'}
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-700">
                      {row.totalCost > 0 ? `$${row.totalCost.toFixed(3)}` : 'N/A'}
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
          <p className="mt-1 text-sm text-slate-500">
            Performance by AI model
            <span className="ml-1 text-xs text-slate-400">
              (active: {currentModel})
            </span>
          </p>

          {/* Distribution bar */}
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
                  {pct >= 20 ? `${row.name.replace('claude-', '')} ${pct.toFixed(0)}%` : ''}
                </div>
              )
            })}
          </div>

          {/* Comparison table */}
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
                  <tr
                    key={row.name}
                    className="border-b border-slate-50"
                  >
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
                      {row.totalCost > 0 ? `$${row.totalCost.toFixed(3)}` : 'N/A'}
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
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark"
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
    </div>
  )
}
