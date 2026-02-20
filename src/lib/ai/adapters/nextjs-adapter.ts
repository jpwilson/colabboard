import { streamText, convertToModelMessages, stepCountIs } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { after } from 'next/server'
import { aiTools } from '@/lib/ai/tools'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'
import { langfuseSpanProcessor } from '@/lib/ai/tracing'
import type { AgentAdapter, AgentChatRequest } from '@/lib/ai/agent-adapter'

export class NextJSAdapter implements AgentAdapter {
  readonly name = 'Next.js SDK (Vercel AI + Anthropic)'

  async chat(request: AgentChatRequest): Promise<Response> {
    const { messages, boardId, verbose, supabase } = request

    const result = streamText({
      model: anthropic('claude-sonnet-4-5'),
      system: buildSystemPrompt(boardId, verbose),
      messages: await convertToModelMessages(messages),
      tools: aiTools(boardId, supabase),
      stopWhen: stepCountIs(10),
      experimental_telemetry: { isEnabled: true },
    })

    // Flush Langfuse traces after response completes (non-blocking)
    after(async () => {
      await langfuseSpanProcessor.forceFlush()
    })

    return result.toUIMessageStreamResponse()
  }

  async healthCheck(): Promise<boolean> {
    // Next.js adapter is always available (inline)
    return true
  }
}
