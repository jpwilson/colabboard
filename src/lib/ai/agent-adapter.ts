import type { UIMessage } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface AgentChatRequest {
  messages: UIMessage[]
  boardId: string
  verbose: boolean
  model: string
  supabase: SupabaseClient
  domain?: string
}

export interface AgentAdapter {
  readonly name: string
  chat(request: AgentChatRequest): Promise<Response>
  healthCheck(): Promise<boolean>
}
