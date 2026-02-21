import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isUserSuperuser, setAppConfig } from '@/lib/supabase/admin'
import type { AgentBackend } from '@/types/board'

const VALID_BACKENDS: AgentBackend[] = ['nextjs', 'docker']
const VALID_MODELS = ['claude-sonnet-4-5', 'claude-haiku-4-5']

export async function POST(request: Request) {
  const supabase = await createClient()
  const isSuperuser = await isUserSuperuser(supabase)

  if (!isSuperuser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { backend, model } = (await request.json()) as {
    backend?: AgentBackend
    model?: string
  }

  if (!backend || !VALID_BACKENDS.includes(backend)) {
    return NextResponse.json(
      { error: 'Invalid backend. Must be "nextjs" or "docker".' },
      { status: 400 },
    )
  }

  if (model && !VALID_MODELS.includes(model)) {
    return NextResponse.json(
      {
        error: `Invalid model. Must be one of: ${VALID_MODELS.join(', ')}`,
      },
      { status: 400 },
    )
  }

  await setAppConfig(supabase, 'agent_backend', backend)

  if (model) {
    await setAppConfig(supabase, 'agent_model', model)
  }

  return NextResponse.json({ success: true, backend, model: model ?? null })
}
