import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vzfviiluarwmqnbzqqzx.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_BkSTOYI4_ypuJJ2fMK2q4g_OmipBtIK'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: SupabaseClient<any> | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createClient(): SupabaseClient<any> {
  if (!_client) {
    _client = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return _client
}
