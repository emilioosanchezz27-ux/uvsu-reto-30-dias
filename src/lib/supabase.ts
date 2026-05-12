import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: SupabaseClient<any> | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createClient(): SupabaseClient<any> | null {
  // Las vars se leen aquí (no a nivel de módulo) para garantizar
  // que Next.js las inline correctamente en el bundle del cliente
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.warn('[Supabase] Variables de entorno no definidas — modo offline activado')
    console.warn('[Supabase] URL:', url ? '✓' : '✗', '| KEY:', key ? '✓' : '✗')
    return null
  }

  if (!_client) {
    _client = createSupabaseClient(url, key)
  }

  return _client
}
