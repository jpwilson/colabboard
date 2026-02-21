'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function acceptJoin(boardId: string, slug: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/board/${slug}/join`)
  }

  // Check if membership row already exists
  const { data: existing } = await supabase
    .from('board_members')
    .select('id, status')
    .eq('board_id', boardId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    // Update existing row to accepted
    await supabase
      .from('board_members')
      .update({ status: 'accepted' })
      .eq('id', existing.id)
  } else {
    // Insert new row as accepted editor
    await supabase.from('board_members').insert({
      board_id: boardId,
      user_id: user.id,
      role: 'editor',
      status: 'accepted',
    })
  }

  redirect(`/board/${slug}`)
}

export async function declineJoin(boardId: string, slug: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/board/${slug}/join`)
  }

  // Check if membership row already exists
  const { data: existing } = await supabase
    .from('board_members')
    .select('id')
    .eq('board_id', boardId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    await supabase
      .from('board_members')
      .update({ status: 'declined' })
      .eq('id', existing.id)
  } else {
    await supabase.from('board_members').insert({
      board_id: boardId,
      user_id: user.id,
      role: 'editor',
      status: 'declined',
    })
  }

  redirect('/dashboard')
}
