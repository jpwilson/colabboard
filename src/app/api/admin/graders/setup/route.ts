import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isUserSuperuser, createServiceRoleClient } from '@/lib/supabase/admin'

const GRADER_COUNT = 10
const GRADER_DOMAIN = 'orim.test'
const GRADER_PASSWORD = 'grader-eval-2026'

export async function POST() {
  // Only superusers can set up grader accounts
  const supabase = await createClient()
  const isSuperuser = await isUserSuperuser(supabase)
  if (!isSuperuser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const adminClient = createServiceRoleClient()

  // Fetch all existing users once (efficient)
  const { data: allUsers } = await adminClient.auth.admin.listUsers({
    perPage: 1000,
  })
  const existingEmails = new Set(
    (allUsers?.users ?? []).map((u) => u.email),
  )

  const results: Array<{
    email: string
    status: 'created' | 'exists' | 'error'
    error?: string
  }> = []

  for (let i = 1; i <= GRADER_COUNT; i++) {
    const email = `grader${i}@${GRADER_DOMAIN}`
    const displayName = `Grader ${i}`

    if (existingEmails.has(email)) {
      results.push({ email, status: 'exists' })
      continue
    }

    try {
      const { error } = await adminClient.auth.admin.createUser({
        email,
        password: GRADER_PASSWORD,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
          is_grader: true,
        },
      })

      if (error) {
        results.push({ email, status: 'error', error: error.message })
      } else {
        results.push({ email, status: 'created' })
      }
    } catch (err) {
      results.push({
        email,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return NextResponse.json({ message: 'Grader setup complete', results })
}
