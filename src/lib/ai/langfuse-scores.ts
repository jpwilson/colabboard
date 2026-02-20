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
 * Fetch traces from Langfuse for analytics.
 */
export async function fetchTraces(options?: {
  limit?: number
  name?: string
}): Promise<unknown[]> {
  const auth = getAuthHeader()
  if (!auth) return []

  const params = new URLSearchParams()
  if (options?.limit) params.set('limit', String(options.limit))
  if (options?.name) params.set('name', options.name)

  const res = await fetch(
    `${LANGFUSE_BASE_URL}/api/public/traces?${params.toString()}`,
    {
      headers: { Authorization: auth },
    },
  ).catch(() => null)

  if (!res?.ok) return []
  const data = await res.json()
  return data.data ?? []
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

  const params = new URLSearchParams()
  if (options?.limit) params.set('limit', String(options.limit))
  if (options?.name) params.set('name', options.name)

  const res = await fetch(
    `${LANGFUSE_BASE_URL}/api/public/scores?${params.toString()}`,
    {
      headers: { Authorization: auth },
    },
  ).catch(() => null)

  if (!res?.ok) return []
  const data = await res.json()
  return data.data ?? []
}
