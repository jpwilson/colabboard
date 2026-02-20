import { createClient } from '@/lib/supabase/server'
import { getAgentBackend } from '@/lib/supabase/admin'

function getTimeRanges() {
  const now = Date.now()
  return {
    oneDayAgo: new Date(now - 86400000).toISOString(),
    oneWeekAgo: new Date(now - 7 * 86400000).toISOString(),
  }
}

export default async function AnalyticsPage() {
  const supabase = await createClient()

  // Fetch platform stats
  const { oneDayAgo, oneWeekAgo } = getTimeRanges()

  const [
    totalObjectsResult,
    recentObjectsResult,
    weekObjectsResult,
    totalBoardsResult,
    activeBoardsResult,
    backend,
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
  ])

  const langfuseUrl = process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com'

  const stats = [
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
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
      <p className="mt-1 text-sm text-slate-500">
        Platform activity and AI agent observability
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
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

      {/* Agent status */}
      <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">
          Agent Backend Status
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Current active backend:{' '}
          <span className="font-medium text-slate-700">
            {backend === 'nextjs' ? 'Next.js SDK' : 'Docker (Python)'}
          </span>
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-100 p-4">
            <p className="text-sm font-medium text-slate-700">Model</p>
            <p className="mt-1 text-xs text-slate-500">
              {backend === 'nextjs'
                ? 'Claude Sonnet 4.5 (via Vercel AI SDK)'
                : 'Configured in Docker service'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 p-4">
            <p className="text-sm font-medium text-slate-700">Observability</p>
            <p className="mt-1 text-xs text-slate-500">
              Langfuse (OpenTelemetry)
            </p>
          </div>
        </div>
      </div>

      {/* Langfuse link */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">
          Langfuse Dashboard
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Full AI agent traces, latency, token costs, and error rates are
          tracked in Langfuse.
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
            Traces include: tool calls, token usage, latency, error rates
          </span>
        </div>
      </div>

      {/* Tracked metrics reference */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">
          Tracked Metrics
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            {
              metric: 'Total Traces',
              desc: 'Every AI chat request creates a trace',
            },
            {
              metric: 'Avg Latency',
              desc: 'Time from request to first token',
            },
            {
              metric: 'Token Costs',
              desc: 'Input + output token pricing per model',
            },
            {
              metric: 'Error Rate',
              desc: 'Failed tool calls and API errors',
            },
            {
              metric: 'Tool Usage',
              desc: 'Breakdown by tool (create, update, delete, etc.)',
            },
            {
              metric: 'Model Performance',
              desc: 'Per-model comparison when multiple backends active',
            },
          ].map((item) => (
            <div key={item.metric} className="flex items-start gap-3">
              <div className="mt-0.5 h-2 w-2 rounded-full bg-primary" />
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {item.metric}
                </p>
                <p className="text-xs text-slate-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
