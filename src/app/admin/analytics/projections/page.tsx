import { Suspense } from 'react'
import {
  getLangfuseTraces,
  getLangfuseObservations,
  computeModelUsage,
  computeProjectionTiers,
  getAvgPerRequest,
  type LangfuseTrace,
  type LangfuseObservation,
} from '@/components/admin/analytics/analytics-data'
import {
  ProjectionsSkeleton,
  FadeIn,
} from '@/components/admin/analytics/skeletons'

export default function ProjectionsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">
        Production Cost Projections
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Estimated costs at different user scales
      </p>

      <Suspense fallback={<ProjectionsSkeleton />}>
        <ProjectionsContent />
      </Suspense>
    </div>
  )
}

async function ProjectionsContent() {
  const [rawTraces, rawObservations] = await Promise.all([
    getLangfuseTraces(),
    getLangfuseObservations(),
  ])

  const traces = rawTraces as LangfuseTrace[]
  const observations = rawObservations as LangfuseObservation[]

  const modelUsage = computeModelUsage(observations)
  const totalCost = traces.reduce((sum, t) => sum + (t.totalCost ?? 0), 0)
  const totalTraces = traces.length
  const totalInputTokens = modelUsage.reduce((s, r) => s + r.input, 0)
  const totalOutputTokens = modelUsage.reduce((s, r) => s + r.output, 0)

  const { avgInputPerRequest, avgOutputPerRequest } = getAvgPerRequest(
    totalTraces,
    totalInputTokens,
    totalOutputTokens,
  )
  const avgCostPerRequest =
    totalTraces > 0 ? totalCost / totalTraces : 0.009

  const tiers = computeProjectionTiers(
    totalCost,
    totalTraces,
    totalInputTokens,
    totalOutputTokens,
  )

  return (
    <FadeIn>
      {/* Assumptions */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Assumptions</h2>
        <p className="mt-1 text-sm text-slate-500">
          Based on observed usage patterns
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            {
              label: 'Avg Cost / Request',
              value: `$${avgCostPerRequest.toFixed(4)}`,
            },
            {
              label: 'Avg Input Tokens',
              value: Math.round(avgInputPerRequest).toLocaleString(),
            },
            {
              label: 'Avg Output Tokens',
              value: Math.round(avgOutputPerRequest).toLocaleString(),
            },
            { label: 'Sessions / User / Mo', value: '10' },
            { label: 'Commands / Session', value: '5' },
            { label: 'Commands / User / Mo', value: '50' },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-400">
                {item.label}
              </p>
              <p className="mt-1 text-lg font-bold text-slate-800">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Tier Projections Table */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
              {tiers.map((tier) => (
                <tr
                  key={tier.users}
                  className="border-b border-slate-50"
                >
                  <td className="py-3 pr-4 font-bold text-slate-800">
                    {tier.users.toLocaleString()}
                  </td>
                  <td className="py-3 pr-4 text-right text-slate-700">
                    {tier.monthlyCommands.toLocaleString()}
                  </td>
                  <td className="py-3 pr-4 text-right text-slate-700">
                    ${tier.llmCost.toFixed(0)}
                  </td>
                  <td className="py-3 pr-4 text-right text-slate-700">
                    ${tier.infraCost}
                  </td>
                  <td className="py-3 pr-4 text-right font-bold text-slate-800">
                    ${tier.totalCost.toFixed(0)}
                  </td>
                  <td className="py-3 text-xs text-slate-500">
                    {tier.infraNote}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Optimization Notes */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">
          Optimization Opportunities
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Strategies to reduce costs at scale
        </p>
        <div className="mt-4 space-y-3">
          {[
            {
              title: 'Prompt Caching',
              desc: 'Anthropic prompt caching can reduce input token costs by up to 90% for repeated system prompts and context.',
              impact: 'High',
              impactColor: 'bg-green-100 text-green-700',
            },
            {
              title: 'Model Tiering',
              desc: 'Use Haiku for simple commands (add sticky note) and Sonnet for complex ones (reorganize board). Route based on command complexity.',
              impact: 'High',
              impactColor: 'bg-green-100 text-green-700',
            },
            {
              title: 'Response Streaming',
              desc: 'Already implemented. Reduces perceived latency and allows early termination.',
              impact: 'Done',
              impactColor: 'bg-blue-100 text-blue-700',
            },
            {
              title: 'Rate Limiting',
              desc: 'Implement per-user rate limits (e.g. 50 commands/hour) to prevent abuse and control costs.',
              impact: 'Medium',
              impactColor: 'bg-amber-100 text-amber-700',
            },
            {
              title: 'Batch Operations',
              desc: 'Group multiple small operations into single API calls to reduce per-request overhead.',
              impact: 'Low',
              impactColor: 'bg-slate-100 text-slate-600',
            },
          ].map((opt) => (
            <div
              key={opt.title}
              className="flex items-start gap-4 rounded-lg border border-slate-100 p-4"
            >
              <div className="flex-1">
                <p className="font-medium text-slate-800">{opt.title}</p>
                <p className="mt-0.5 text-sm text-slate-500">{opt.desc}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${opt.impactColor}`}
              >
                {opt.impact}
              </span>
            </div>
          ))}
        </div>
      </div>
    </FadeIn>
  )
}
