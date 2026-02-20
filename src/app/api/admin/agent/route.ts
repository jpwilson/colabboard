import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isUserSuperuser, setAppConfig } from '@/lib/supabase/admin'
import type { AgentBackend } from '@/types/board'

export async function POST(request: Request) {
  const supabase = await createClient()
  const isSuperuser = await isUserSuperuser(supabase)

  if (!isSuperuser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { backend } = (await request.json()) as { backend?: AgentBackend }

  if (!backend || !['nextjs', 'docker'].includes(backend)) {
    return NextResponse.json(
      { error: 'Invalid backend. Must be "nextjs" or "docker".' },
      { status: 400 },
    )
  }

  await setAppConfig(supabase, 'agent_backend', backend)

  return NextResponse.json({ success: true, backend })
}
