import { createClient } from '@/lib/supabase/server'
import { getAgentBackend } from '@/lib/supabase/admin'
import { fetchTraces, fetchScores } from '@/lib/ai/langfuse-scores'

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
    langfuseTraces,
    langfuseScoresData,
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
    fetchTraces({ limit: 100, name: 'ai-chat' }),
    fetchScores({ limit: 500 }),
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

      {/* Scores Summary */}
      {scores.length > 0 && (
        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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

      {/* Agent Backend */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">
          Agent Backend
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Active:{' '}
          <span className="font-medium text-slate-700">
            {backend === 'nextjs' ? 'Next.js SDK (Vercel AI + Anthropic)' : 'Docker (Python)'}
          </span>
        </p>
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
            Traces enriched with: userId, boardId, command type, quality scores
          </span>
        </div>
      </div>
    </div>
  )
}
