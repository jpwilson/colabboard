import { createClient } from '@/lib/supabase/server'
import { getAgentBackend } from '@/lib/supabase/admin'
import { AgentSelector } from './AgentSelector'

export default async function AgentPage() {
  const supabase = await createClient()
  const currentBackend = await getAgentBackend(supabase)

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Agent Configuration</h1>
      <p className="mt-1 text-sm text-slate-500">
        Choose which AI agent backend powers the board assistant
      </p>

      <div className="mt-8 max-w-2xl">
        <AgentSelector currentBackend={currentBackend} />
      </div>
    </div>
  )
}
