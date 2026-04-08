'use client'

import { createClient } from '@supabase/supabase-js'

let client: ReturnType<typeof createClient> | null = null

export function createBrowserClient() {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase public environment variables')
  }

  client = createClient(url, key)
  return client
}
