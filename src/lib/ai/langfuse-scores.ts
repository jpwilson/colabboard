/**
 * Post scores to Langfuse via REST API.
 *
 * The @langfuse/tracing SDK doesn't expose a score.create() method,
 * so we use the public REST API directly.
 *
 * Requires LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY env vars.
 */

const LANGFUSE_BASE_URL =
  process.env.LANGFUSE_BASE_URL || 'https://us.cloud.langfuse.com'

function getAuthHeader(): string | null {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY
  const secretKey = process.env.LANGFUSE_SECRET_KEY
  if (!publicKey || !secretKey) return null
  return `Basic ${Buffer.from(`${publicKey}:${secretKey}`).toString('base64')}`
}

export async function postScore(
  traceId: string,
  name: string,
  value: number,
  comment?: string,
): Promise<void> {
  const auth = getAuthHeader()
  if (!auth) return

  await fetch(`${LANGFUSE_BASE_URL}/api/public/scores`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: auth,
    },
    body: JSON.stringify({
      traceId,
      name,
      value,
      dataType: 'NUMERIC',
      ...(comment ? { comment } : {}),
    }),
  }).catch(() => {
    // Silently fail — scoring should never break the main flow
  })
}

export async function postScores(
  traceId: string,
  scores: Record<string, number>,
): Promise<void> {
  const promises = Object.entries(scores).map(([name, value]) =>
    postScore(traceId, name, value),
  )
  await Promise.allSettled(promises)
}

/**
 * Patch a trace via the Langfuse ingestion API (upsert).
 *
 * updateActiveTrace() doesn't connect to the OTel-generated trace,
 * so we use the REST API directly to set input, output, metadata, etc.
 */
export async function patchTrace(
  traceId: string,
  patch: {
    input?: unknown
    output?: unknown
    userId?: string
    sessionId?: string
    tags?: string[]
    metadata?: Record<string, unknown>
  },
): Promise<void> {
  const auth = getAuthHeader()
  if (!auth) return

  await fetch(`${LANGFUSE_BASE_URL}/api/public/ingestion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: auth,
    },
    body: JSON.stringify({
      batch: [
        {
          id: crypto.randomUUID(),
          type: 'trace-create',
          timestamp: new Date().toISOString(),
          body: {
            id: traceId,
            ...patch,
          },
        },
      ],
    }),
  }).catch(() => {
    // Silently fail
  })
}

/**
 * Fetch a single page from a Langfuse paginated endpoint.
 */
async function fetchPage(
  endpoint: string,
  auth: string,
  params: URLSearchParams,
): Promise<{ data: unknown[]; totalPages: number }> {
  const res = await fetch(
    `${LANGFUSE_BASE_URL}${endpoint}?${params.toString()}`,
    {
      headers: { Authorization: auth },
      cache: 'no-store',
    },
  ).catch(() => null)

  if (!res?.ok) return { data: [], totalPages: 0 }
  const json = await res.json()
  return {
    data: json.data ?? [],
    totalPages: json.meta?.totalPages ?? 1,
  }
}

/**
 * Fetch all pages from a paginated Langfuse endpoint (max 100 per page).
 */
async function fetchAllPages(
  endpoint: string,
  auth: string,
  baseParams: Record<string, string>,
  maxItems: number,
): Promise<unknown[]> {
  const PAGE_SIZE = 100
  const params = new URLSearchParams({ ...baseParams, limit: String(PAGE_SIZE) })

  const first = await fetchPage(endpoint, auth, params)
  if (first.data.length === 0) return []

  const all = [...first.data]
  const pages = Math.min(first.totalPages, Math.ceil(maxItems / PAGE_SIZE))

  for (let page = 2; page <= pages && all.length < maxItems; page++) {
    params.set('page', String(page))
    const next = await fetchPage(endpoint, auth, params)
    if (next.data.length === 0) break
    all.push(...next.data)
  }

  return all.slice(0, maxItems)
}

/**
 * Fetch traces from Langfuse for analytics.
 */
export async function fetchTraces(options?: {
  limit?: number
  name?: string
}): Promise<unknown[]> {
  const auth = getAuthHeader()
  if (!auth) return []

  const params: Record<string, string> = {}
  if (options?.name) params.name = options.name

  return fetchAllPages('/api/public/traces', auth, params, options?.limit ?? 100)
}

/**
 * Fetch aggregated scores from Langfuse.
 */
export async function fetchScores(options?: {
  limit?: number
  name?: string
}): Promise<unknown[]> {
  const auth = getAuthHeader()
  if (!auth) return []

  const params: Record<string, string> = {}
  if (options?.name) params.name = options.name

  return fetchAllPages('/api/public/scores', auth, params, options?.limit ?? 500)
}

/**
 * Fetch observations (generations/spans) from Langfuse for token usage data.
 */
export async function fetchObservations(options?: {
  limit?: number
  type?: string
}): Promise<unknown[]> {
  const auth = getAuthHeader()
  if (!auth) return []

  const params: Record<string, string> = {}
  if (options?.type) params.type = options.type

  return fetchAllPages(
    '/api/public/observations',
    auth,
    params,
    options?.limit ?? 200,
  )
}
