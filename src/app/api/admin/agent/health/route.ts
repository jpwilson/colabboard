import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isUserSuperuser } from '@/lib/supabase/admin'
import { getActiveAdapter } from '@/lib/ai/agent-registry'
import type { AgentBackend } from '@/types/board'

export async function GET(request: Request) {
  const supabase = await createClient()
  const isSuperuser = await isUserSuperuser(supabase)

  if (!isSuperuser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const backend = searchParams.get('backend') as AgentBackend

  if (!backend || !['nextjs', 'docker'].includes(backend)) {
    return NextResponse.json({ error: 'Invalid backend' }, { status: 400 })
  }

  const adapter = getActiveAdapter(backend)
  const healthy = await adapter.healthCheck()

  return NextResponse.json({ backend, healthy, name: adapter.name })
}
