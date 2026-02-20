import { streamText, convertToModelMessages, stepCountIs } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { after } from 'next/server'
import { aiTools } from '@/lib/ai/tools'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'
import {
  langfuseSpanProcessor,
  updateActiveTrace,
  getActiveTraceId,
} from '@/lib/ai/tracing'
import { postScores } from '@/lib/ai/langfuse-scores'
import type { AgentAdapter, AgentChatRequest } from '@/lib/ai/agent-adapter'

export class NextJSAdapter implements AgentAdapter {
  readonly name = 'Next.js SDK (Vercel AI + Anthropic)'

  async chat(request: AgentChatRequest): Promise<Response> {
    const { messages, boardId, verbose, supabase } = request
    const startTime = Date.now()
    const traceId = getActiveTraceId()

    const result = streamText({
      model: anthropic('claude-sonnet-4-5'),
      system: buildSystemPrompt(boardId, verbose),
      messages: await convertToModelMessages(messages),
      tools: aiTools(boardId, supabase),
      stopWhen: stepCountIs(10),
      experimental_telemetry: { isEnabled: true },
    })

    // Post-response: collect metrics, attach output, and score
    after(async () => {
      try {
        // Await the full response to collect metrics
        const steps = await result.steps
        const text = await result.text

        // Analyze tool usage across all steps
        const toolCalls = steps.flatMap(
          (s: { toolCalls?: Array<{ toolName: string }> }) =>
            s.toolCalls ?? [],
        )
        const toolNames = toolCalls.map((tc) => tc.toolName)
        const gotBoardState = toolNames.includes('getBoardState')
        const hitStepLimit = steps.length >= 10

        // Count objects affected by analyzing tool names
        // (Since tool results have complex types, count by tool name instead)
        const createTools = [
          'createStickyNote',
          'createShape',
          'createFrame',
          'createConnector',
        ]
        const modifyTools = [
          'moveObject',
          'resizeObject',
          'updateText',
          'changeColor',
          'arrangeObjects',
        ]
        let objectsCreated = 0
        let objectsModified = 0
        let objectsDeleted = 0
        for (const name of toolNames) {
          if (createTools.includes(name)) objectsCreated++
          else if (modifyTools.includes(name)) objectsModified++
          else if (name === 'deleteObject') objectsDeleted++
        }

        const objectsAffected =
          objectsCreated + objectsModified + objectsDeleted
        const latencyMs = Date.now() - startTime

        // Update trace with output
        updateActiveTrace({
          output: text || `[${toolCalls.length} tool calls]`,
          metadata: {
            toolCalls: toolNames,
            toolCallCount: toolCalls.length,
            objectsCreated,
            objectsModified,
            objectsDeleted,
            gotBoardState,
            hitStepLimit,
            latencyMs,
          },
        })

        // Post scores to Langfuse via REST API
        if (traceId) {
          await postScores(traceId, {
            tool_call_count: toolCalls.length,
            objects_affected: objectsAffected,
            got_board_state: gotBoardState ? 1 : 0,
            hit_step_limit: hitStepLimit ? 1 : 0,
            latency_ms: latencyMs,
            error: 0,
          })
        }
      } catch {
        // Don't let scoring failures break the response
      }

      await langfuseSpanProcessor.forceFlush()
    })

    return result.toUIMessageStreamResponse()
  }

  async healthCheck(): Promise<boolean> {
    // Next.js adapter is always available (inline)
    return true
  }
}
