import type { UIMessage } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAgentBackend, getAgentModel } from '@/lib/supabase/admin'
import { getActiveAdapter } from '@/lib/ai/agent-registry'
import { observe, getActiveTraceId } from '@/lib/ai/tracing'
import { classifyCommand } from '@/lib/ai/classify-command'
import { patchTrace } from '@/lib/ai/langfuse-scores'

export const maxDuration = 30

async function handler(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as {
    messages?: UIMessage[]
    boardId?: string
    verbose?: boolean
  }
  const { messages, boardId, verbose } = body

  if (!boardId) {
    return NextResponse.json({ error: 'boardId is required' }, { status: 400 })
  }

  if (!messages || messages.length === 0) {
    return NextResponse.json(
      { error: 'messages are required' },
      { status: 400 },
    )
  }

  // Verify user has access to this board (owner or member)
  const { data: board } = await supabase
    .from('boards')
    .select('id, owner_id')
    .eq('id', boardId)
    .single()

  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  if (board.owner_id !== user.id) {
    const { data: membership } = await supabase
      .from('board_members')
      .select('id')
      .eq('board_id', boardId)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Get active agent backend + model from config and dispatch
  const [backend, model] = await Promise.all([
    getAgentBackend(supabase),
    getAgentModel(supabase),
  ])
  const adapter = getActiveAdapter(backend)

  // Extract user's last message for trace metadata
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
  const userInput = lastUserMsg
    ? lastUserMsg.parts
        ?.filter((p) => p.type === 'text')
        .map((p) => (p as { type: 'text'; text: string }).text)
        .join(' ') || ''
    : ''
  const commandType = classifyCommand(userInput)

  // Enrich Langfuse trace with user/board/command context via REST API
  // (updateActiveTrace doesn't connect to OTel-generated traces)
  const traceId = getActiveTraceId()
  if (traceId) {
    await patchTrace(traceId, {
      userId: user.id,
      sessionId: `board:${boardId}`,
      input: userInput,
      tags: [`backend:${backend}`, `command:${commandType}`, `model:${model}`],
      metadata: {
        boardId,
        backend,
        verbose: verbose ?? false,
        messageCount: messages.length,
        commandType,
        userEmail: user.email,
      },
    })
  }

  return adapter.chat({
    messages,
    boardId,
    verbose: verbose ?? false,
    model,
    supabase,
  })
}

export const POST = observe(handler, {
  name: 'ai-chat',
  endOnExit: false,
})
