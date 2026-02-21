import { createClient as createRawClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AgentBackend } from '@/types/board'

/**
 * Creates a Supabase client with the service role key.
 * ONLY use server-side (Server Components, API routes).
 * Bypasses RLS and has auth.admin.* powers.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
    )
  }
  return createRawClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export const PERMANENT_SUPERUSER_EMAIL = 'jeanpaulwilson@gmail.com'

export async function isUserSuperuser(
  supabase: SupabaseClient,
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.user_metadata?.is_superuser === true
}

export async function getAppConfig<T = unknown>(
  supabase: SupabaseClient,
  key: string,
): Promise<T | null> {
  const { data } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', key)
    .single()
  return (data?.value as T) ?? null
}

export async function setAppConfig(
  supabase: SupabaseClient,
  key: string,
  value: unknown,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  await supabase.from('app_config').upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
    updated_by: user?.id,
  })
}

export async function getAgentBackend(
  supabase: SupabaseClient,
): Promise<AgentBackend> {
  const backend = await getAppConfig<AgentBackend>(supabase, 'agent_backend')
  return backend ?? 'nextjs'
}

export async function getAgentModel(
  supabase: SupabaseClient,
): Promise<string> {
  const model = await getAppConfig<string>(supabase, 'agent_model')
  return model ?? 'claude-sonnet-4-5'
}
