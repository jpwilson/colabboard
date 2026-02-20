/**
 * Langfuse observability for AI SDK.
 *
 * Traces every streamText call via OpenTelemetry with:
 * - Token counts (input/output)
 * - Latency per step
 * - Tool call details
 * - Cost estimation
 *
 * Requires env vars:
 *   LANGFUSE_SECRET_KEY=sk-lf-...
 *   LANGFUSE_PUBLIC_KEY=pk-lf-...
 *   LANGFUSE_BASE_URL=https://us.cloud.langfuse.com
 */

export { observe, updateActiveTrace, getActiveTraceId } from '@langfuse/tracing'
export { langfuseSpanProcessor } from '@/instrumentation'
