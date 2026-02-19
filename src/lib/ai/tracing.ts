import * as ai from 'ai'
import { wrapAISDK } from 'langsmith/experimental/vercel'
import { Client } from 'langsmith'

/**
 * LangSmith observability wrapper for AI SDK.
 *
 * Traces every streamText call with:
 * - Token counts (input/output)
 * - Latency per step
 * - Tool call details
 * - Cost estimation
 *
 * Requires env vars:
 *   LANGSMITH_TRACING=true
 *   LANGSMITH_API_KEY=lsv2_...
 *   LANGSMITH_PROJECT=orim-ai-agent
 */

export const langsmithClient = new Client()

export const { streamText } = wrapAISDK(ai, {
  client: langsmithClient,
})
