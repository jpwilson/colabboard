import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface InviteBody {
  email: string
  message?: string
}

export async function POST(
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

  // Verify caller is board owner
  const { data: board } = await supabase
    .from('boards')
    .select('id, owner_id')
    .eq('id', boardId)
    .single()

  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  if (board.owner_id !== user.id) {
    return NextResponse.json({ error: 'Only the board owner can invite members' }, { status: 403 })
  }

  const body = (await request.json()) as InviteBody
  const { email, message } = body

  if (!email?.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  // Look up user by email in profiles
  const { data: invitee } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .single()

  if (!invitee) {
    return NextResponse.json(
      { error: 'No user found with that email. They need to create an account first.' },
      { status: 404 },
    )
  }

  if (invitee.id === user.id) {
    return NextResponse.json({ error: 'You cannot invite yourself' }, { status: 400 })
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('board_members')
    .select('id, status')
    .eq('board_id', boardId)
    .eq('user_id', invitee.id)
    .single()

  if (existing) {
    if (existing.status === 'accepted') {
      return NextResponse.json({ error: 'This user is already a member' }, { status: 409 })
    }
    if (existing.status === 'pending') {
      return NextResponse.json({ error: 'This user has already been invited' }, { status: 409 })
    }
    // Declined — re-invite by updating back to pending
    await supabase
      .from('board_members')
      .update({
        status: 'pending',
        invited_by: user.id,
        message: message || null,
      })
      .eq('id', existing.id)
    return NextResponse.json({ message: 'Invitation re-sent!' })
  }

  // Create new pending invitation
  await supabase.from('board_members').insert({
    board_id: boardId,
    user_id: invitee.id,
    role: 'editor',
    status: 'pending',
    invited_by: user.id,
    message: message || null,
  })

  return NextResponse.json({ message: 'Invitation sent!' })
}
