import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from 'ai'
import type { AgentAdapter, AgentChatRequest } from '@/lib/ai/agent-adapter'

const DOCKER_AGENT_URL = process.env.DOCKER_AGENT_URL || 'http://localhost:8000'

export class DockerAdapter implements AgentAdapter {
  readonly name = 'Docker (Python/LangChain)'

  async chat(request: AgentChatRequest): Promise<Response> {
    const { messages, boardId, verbose, model, domain } = request

    const isHealthy = await this.healthCheck()
    if (!isHealthy) {
      return new Response(
        JSON.stringify({
          error:
            'Docker agent service is not available. Please check the service is running or switch to the Next.js backend.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Forward request to Docker service — returns NDJSON
    const response = await fetch(`${DOCKER_AGENT_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map((m) => ({
          role: m.role,
          content:
            m.parts
              ?.filter(
                (p): p is { type: 'text'; text: string } => p.type === 'text',
              )
              .map((p) => p.text)
              .join('') || '',
        })),
        board_id: boardId,
        verbose,
        model,
        domain: domain ?? 'general',
      }),
    })

    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => 'Unknown error')
      return new Response(JSON.stringify({ error: text }), {
        status: response.status || 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Transform NDJSON stream → UIMessageStream using the official AI SDK
    const ndjsonBody = response.body
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const reader = ndjsonBody.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let currentTextId: string | null = null

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''

            for (const line of lines) {
              if (!line.trim()) continue

              let event: NdjsonEvent
              try {
                event = JSON.parse(line) as NdjsonEvent
              } catch {
                continue // skip malformed lines
              }

              switch (event.type) {
                case 'text': {
                  if (!currentTextId) {
                    currentTextId = crypto.randomUUID()
                    writer.write({ type: 'text-start', id: currentTextId })
                  }
                  const id: string = currentTextId
                  writer.write({
                    type: 'text-delta',
                    delta: event.content,
                    id,
                  })
                  break
                }

                case 'tool_call': {
                  // Close any open text part first
                  if (currentTextId) {
                    writer.write({ type: 'text-end', id: currentTextId })
                    currentTextId = null
                  }

                  const toolCallId = event.id ?? crypto.randomUUID()
                  writer.write({
                    type: 'tool-input-available',
                    toolCallId,
                    toolName: event.name,
                    input: event.args ?? {},
                  })
                  writer.write({
                    type: 'tool-output-available',
                    toolCallId,
                    output: event.output,
                  })
                  break
                }

                case 'error': {
                  if (currentTextId) {
                    writer.write({ type: 'text-end', id: currentTextId })
                    currentTextId = null
                  }
                  writer.write({
                    type: 'error',
                    errorText: event.error ?? 'Unknown error',
                  })
                  break
                }

                case 'finish': {
                  if (currentTextId) {
                    writer.write({ type: 'text-end', id: currentTextId })
                    currentTextId = null
                  }
                  writer.write({
                    type: 'finish',
                    finishReason: 'stop',
                  })
                  break
                }
              }
            }
          }

          // Handle remaining buffer
          if (buffer.trim()) {
            try {
              const event = JSON.parse(buffer) as NdjsonEvent
              if (event.type === 'finish') {
                if (currentTextId) {
                  writer.write({ type: 'text-end', id: currentTextId })
                  currentTextId = null
                }
                writer.write({ type: 'finish', finishReason: 'stop' })
              }
            } catch {
              // ignore
            }
          }

          // Ensure stream is properly closed
          if (currentTextId) {
            writer.write({ type: 'text-end', id: currentTextId })
          }
        } finally {
          reader.releaseLock()
        }
      },
    })

    return createUIMessageStreamResponse({ stream })
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${DOCKER_AGENT_URL}/health`, {
        signal: AbortSignal.timeout(3000),
      })
      return response.ok
    } catch {
      return false
    }
  }
}

/** NDJSON event types emitted by the Python agent service */
type NdjsonEvent =
  | { type: 'text'; content: string }
  | {
      type: 'tool_call'
      id?: string
      name: string
      args?: Record<string, unknown>
      output: unknown
    }
  | { type: 'finish' }
  | { type: 'error'; error?: string }
