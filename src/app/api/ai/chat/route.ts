import { convertToModelMessages, stepCountIs } from 'ai'
import type { UIMessage } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, after } from 'next/server'
import { aiTools } from '@/lib/ai/tools'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'
import { streamText, langsmithClient } from '@/lib/ai/tracing'

export const maxDuration = 30

export async function POST(request: Request) {
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
  }
  const { messages, boardId } = body

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

  const result = streamText({
    model: anthropic('claude-sonnet-4-5-20250514'),
    system: buildSystemPrompt(boardId),
    messages: await convertToModelMessages(messages),
    tools: aiTools(boardId, supabase),
    stopWhen: stepCountIs(10),
  })

  // Flush LangSmith traces after response completes (non-blocking)
  after(async () => {
    await langsmithClient.awaitPendingTraceBatches()
  })

  return result.toUIMessageStreamResponse()
}
