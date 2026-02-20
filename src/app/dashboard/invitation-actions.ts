'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function acceptInvitation(boardId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  await supabase
    .from('board_members')
    .update({ status: 'accepted' })
    .eq('board_id', boardId)
    .eq('user_id', user.id)

  revalidatePath('/dashboard')
}

export async function declineInvitation(boardId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  await supabase
    .from('board_members')
    .update({ status: 'declined' })
    .eq('board_id', boardId)
    .eq('user_id', user.id)

  revalidatePath('/dashboard')
}
