import { createClient } from '@supabase/supabase-js'
import { mmkv } from '@/storage/mmkv'

/** MMKV-backed storage adapter for Supabase session persistence. */
const mmkvStorage = {
  getItem: (key: string): string | null => mmkv.getString(key) ?? null,
  setItem: (key: string, value: string): void => {
    mmkv.set(key, value)
  },
  removeItem: (key: string): void => {
    mmkv.remove(key)
  },
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: mmkvStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  },
)
