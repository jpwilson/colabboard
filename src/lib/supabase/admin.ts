import type { SupabaseClient } from '@supabase/supabase-js'
import type { AgentBackend } from '@/types/board'

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
