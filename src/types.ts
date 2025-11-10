import { createClient } from '@supabase/supabase-js'

// Types for Cloudflare Worker bindings
export type Bindings = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  ENVIRONMENT: string
}

// Types for context variables
export type Variables = {
  supabase: ReturnType<typeof createClient>
  merchantId: string
  apiKey: {
    id: string
    merchant_id: string
    key_type: string
    is_active: boolean
    public_key: string
  }
}
