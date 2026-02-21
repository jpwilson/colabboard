/**
 * Shared data layer for admin analytics pages.
 *
 * Uses React cache() to deduplicate fetches across Suspense boundaries
 * within the same server render pass.
 */
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getAgentBackend, getAgentModel } from '@/lib/supabase/admin'
import {
  fetchTraces,
  fetchScores,
  fetchObservations,
} from '@/lib/ai/langfuse-scores'
import type { AgentBackend } from '@/types/board'

// ── Types ──────────────────────────────────────────────────────────

export interface LangfuseTrace {
  id: string
  name?: string
  latency?: number
  totalCost?: number
  tags?: string[]
  metadata?: Record<string, unknown>
  createdAt?: string
}

export interface LangfuseScore {
  traceId: string
  name: string
  value: number
}

export interface LangfuseObservation {
  id: string
  traceId: string
  type: string
  model?: string
  usage?: { input?: number; output?: number; total?: number }
  totalCost?: number
  startTime?: string
}

export interface GroupStats {
  count: number
  avgLatencyMs: number
  totalCost: number
  errorRate: number
}

export interface ModelUsageRow {
  model: string
  input: number
  output: number
  total: number
  cost: number
  traces: number
}

export interface DailyDataPoint {
  date: string
  count: number
  cost: number
}

export interface UserCostRow {
  user: string
  cost: number
  traces: number
}

export interface ProjectionTier {
  users: number
  infraNote: string
  monthlyCommands: number
  llmCost: number
  infraCost: number
  totalCost: number
}

// ── Cached Fetchers ────────────────────────────────────────────────

export const getSupabaseClient = cache(() => createClient())

export const getLangfuseTraces = cache(
  () => fetchTraces({ limit: 100 }) as Promise<LangfuseTrace[]>,
)

export const getLangfuseScores = cache(
  () => fetchScores({ limit: 500 }) as Promise<LangfuseScore[]>,
)

export const getLangfuseObservations = cache(
  () =>
    fetchObservations({
      type: 'GENERATION',
      limit: 200,
    }) as Promise<LangfuseObservation[]>,
)

export const getCachedBackend = cache(async (): Promise<AgentBackend> => {
  const supabase = await getSupabaseClient()
  return getAgentBackend(supabase)
})

export const getCachedModel = cache(async (): Promise<string> => {
  const supabase = await getSupabaseClient()
  return getAgentModel(supabase)
})

// ── Computation Functions ──────────────────────────────────────────

export function computeGroupStats(
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
          (withLatency.reduce((sum, t) => sum + (t.latency ?? 0), 0) /
            withLatency.length) *
            1000,
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

export function aggregateScoresByName(
  scores: LangfuseScore[],
): Map<string, number[]> {
  const map = new Map<string, number[]>()
  for (const s of scores) {
    const arr = map.get(s.name) ?? []
    arr.push(s.value)
    map.set(s.name, arr)
  }
  return map
}

export function computeBackendBreakdown(
  traces: LangfuseTrace[],
  scores: LangfuseScore[],
) {
  const tracesByBackend = new Map<string, LangfuseTrace[]>()
  const traceBackendMap = new Map<string, string>()
  for (const t of traces) {
    const tag = t.tags?.find((tag) => tag.startsWith('backend:'))
    const b = tag?.replace('backend:', '') ?? 'unknown'
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

  return [...tracesByBackend.entries()]
    .filter(([key]) => key !== 'unknown')
    .map(([name, groupTraces]) => ({
      name,
      ...computeGroupStats(groupTraces, scoresByBackend.get(name) ?? []),
    }))
    .sort((a, b) => b.count - a.count)
}

export function computeModelBreakdown(
  traces: LangfuseTrace[],
  scores: LangfuseScore[],
) {
  const tracesByModel = new Map<string, LangfuseTrace[]>()
  const traceModelMap = new Map<string, string>()
  for (const t of traces) {
    const tag = t.tags?.find((tag) => tag.startsWith('model:'))
    const m = tag?.replace('model:', '') ?? 'unknown'
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

  return [...tracesByModel.entries()]
    .filter(([key]) => key !== 'unknown')
    .map(([name, groupTraces]) => ({
      name,
      ...computeGroupStats(groupTraces, scoresByModel.get(name) ?? []),
    }))
    .sort((a, b) => b.count - a.count)
}

export function computeCommandCounts(
  traces: LangfuseTrace[],
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const t of traces) {
    const cmdTag = t.tags?.find((tag) => tag.startsWith('command:'))
    if (cmdTag) {
      const cmd = cmdTag.replace('command:', '')
      counts.set(cmd, (counts.get(cmd) ?? 0) + 1)
    }
  }
  return counts
}

export function computeModelUsage(
  observations: LangfuseObservation[],
): ModelUsageRow[] {
  const map = new Map<
    string,
    { input: number; output: number; total: number; cost: number; traces: number }
  >()
  for (const obs of observations) {
    const model = obs.model ?? 'unknown'
    const existing = map.get(model) ?? {
      input: 0,
      output: 0,
      total: 0,
      cost: 0,
      traces: 0,
    }
    existing.input += obs.usage?.input ?? 0
    existing.output += obs.usage?.output ?? 0
    existing.total += (obs.usage?.input ?? 0) + (obs.usage?.output ?? 0)
    existing.cost += obs.totalCost ?? 0
    existing.traces += 1
    map.set(model, existing)
  }
  return [...map.entries()]
    .map(([model, usage]) => ({ model, ...usage }))
    .sort((a, b) => b.cost - a.cost)
}

export function computeDailyData(traces: LangfuseTrace[]): DailyDataPoint[] {
  const byDate = new Map<string, { count: number; cost: number }>()
  for (const t of traces) {
    if (!t.createdAt) continue
    const date = t.createdAt.slice(0, 10)
    const existing = byDate.get(date) ?? { count: 0, cost: 0 }
    existing.count += 1
    existing.cost += t.totalCost ?? 0
    byDate.set(date, existing)
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }))
}

export function computeDailyCostByModel(
  observations: LangfuseObservation[],
): { date: string; model: string; cost: number }[] {
  const map = new Map<string, number>()
  for (const obs of observations) {
    if (!obs.startTime) continue
    const date = obs.startTime.slice(0, 10)
    const model = obs.model ?? 'unknown'
    const key = `${date}|${model}`
    map.set(key, (map.get(key) ?? 0) + (obs.totalCost ?? 0))
  }
  return [...map.entries()]
    .map(([key, cost]) => {
      const [date, model] = key.split('|')
      return { date, model, cost }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function computeUserConsumption(
  traces: LangfuseTrace[],
): UserCostRow[] {
  const map = new Map<string, { cost: number; traces: number }>()
  for (const t of traces) {
    const userId = t.metadata?.userId as string | undefined
    const key = userId ?? 'anonymous'
    const existing = map.get(key) ?? { cost: 0, traces: 0 }
    existing.cost += t.totalCost ?? 0
    existing.traces += 1
    map.set(key, existing)
  }
  return [...map.entries()]
    .map(([user, data]) => ({
      user: user.slice(0, 12) + (user.length > 12 ? '...' : ''),
      ...data,
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10)
}

export function computeProjectionTiers(
  metricsTotalCost: number,
  metricsTotalTraces: number,
  _totalInputTokens: number,
  _totalOutputTokens: number,
): ProjectionTier[] {
  const avgCostPerRequest =
    metricsTotalTraces > 0 ? metricsTotalCost / metricsTotalTraces : 0.009

  const COMMANDS_PER_SESSION = 5
  const SESSIONS_PER_MONTH = 10
  const COMMANDS_PER_USER_PER_MONTH = COMMANDS_PER_SESSION * SESSIONS_PER_MONTH

  return [
    { users: 100, infraNote: 'Free tier covers most infra' },
    { users: 1_000, infraNote: 'Supabase Pro ($25) + Vercel Pro ($20)' },
    { users: 10_000, infraNote: 'Add caching & rate limiting' },
    { users: 100_000, infraNote: 'Prompt caching + model tiering critical' },
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
}

export function getAvgPerRequest(
  metricsTotalTraces: number,
  totalInputTokens: number,
  totalOutputTokens: number,
) {
  return {
    avgInputPerRequest:
      metricsTotalTraces > 0 ? totalInputTokens / metricsTotalTraces : 2000,
    avgOutputPerRequest:
      metricsTotalTraces > 0 ? totalOutputTokens / metricsTotalTraces : 600,
  }
}
