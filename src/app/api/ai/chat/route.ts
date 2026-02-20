import type { UIMessage } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAgentBackend } from '@/lib/supabase/admin'
import { getActiveAdapter } from '@/lib/ai/agent-registry'
import { observe } from '@/lib/ai/tracing'

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
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Get active agent backend from config and dispatch
  const backend = await getAgentBackend(supabase)
  const adapter = getActiveAdapter(backend)

  return adapter.chat({
    messages,
    boardId,
    verbose: verbose ?? false,
    supabase,
  })
}

export const POST = observe(handler, {
  name: 'ai-chat',
  endOnExit: false,
})
