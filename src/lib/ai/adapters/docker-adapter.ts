import type { AgentAdapter, AgentChatRequest } from '@/lib/ai/agent-adapter'

const DOCKER_AGENT_URL = process.env.DOCKER_AGENT_URL || 'http://localhost:8000'

export class DockerAdapter implements AgentAdapter {
  readonly name = 'Docker (Python/LangChain)'

  async chat(request: AgentChatRequest): Promise<Response> {
    const { messages, boardId, verbose } = request

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

    // Forward request to Docker service
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
      }),
    })

    return response
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
