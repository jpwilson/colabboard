import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  isUserSuperuser,
  createServiceRoleClient,
  PERMANENT_SUPERUSER_EMAIL,
} from '@/lib/supabase/admin'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params

  // Verify caller is a superuser
  const supabase = await createClient()
  const isSuperuser = await isUserSuperuser(supabase)
  if (!isSuperuser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await request.json()) as { is_superuser?: boolean }
  if (typeof body.is_superuser !== 'boolean') {
    return NextResponse.json(
      { error: 'is_superuser must be a boolean' },
      { status: 400 },
    )
  }

  const adminClient = createServiceRoleClient()
  const { data: targetUser, error: fetchError } =
    await adminClient.auth.admin.getUserById(userId)

  if (fetchError || !targetUser?.user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (targetUser.user.email === PERMANENT_SUPERUSER_EMAIL) {
    return NextResponse.json(
      { error: 'Cannot modify permanent superuser' },
      { status: 403 },
    )
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    userId,
    {
      user_metadata: {
        ...targetUser.user.user_metadata,
        is_superuser: body.is_superuser,
      },
    },
  )

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    userId,
    is_superuser: body.is_superuser,
  })
}
