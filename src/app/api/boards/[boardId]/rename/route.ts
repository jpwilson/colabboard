import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const { boardId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name } = (await request.json()) as { name?: string }
  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  // RLS ensures only the owner can update their boards
  const { error } = await supabase
    .from('boards')
    .update({ name: name.trim() })
    .eq('id', boardId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
