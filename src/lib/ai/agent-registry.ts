import type { AgentBackend } from '@/types/board'
import type { AgentAdapter } from '@/lib/ai/agent-adapter'
import { NextJSAdapter } from '@/lib/ai/adapters/nextjs-adapter'
import { DockerAdapter } from '@/lib/ai/adapters/docker-adapter'

const adapters: Record<AgentBackend, AgentAdapter> = {
  nextjs: new NextJSAdapter(),
  docker: new DockerAdapter(),
}

export function getActiveAdapter(backend: AgentBackend): AgentAdapter {
  return adapters[backend] ?? adapters.nextjs
}

export function getAllAdapters(): Record<AgentBackend, AgentAdapter> {
  return adapters
}
