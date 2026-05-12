// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn('[Supabase] Variables de entorno no definidas — modo offline activado')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: SupabaseClient<any> | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createClient(): SupabaseClient<any> | null {
  if (!url || !key) return null
  if (!client) {
    client = createSupabaseClient(url, key)
  }
  return client
}
