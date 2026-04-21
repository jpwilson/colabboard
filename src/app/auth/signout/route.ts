import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    `${request.headers.get('x-forwarded-proto') ?? 'https'}://${request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host}`
  return NextResponse.redirect(`${baseUrl}/login`)
}
