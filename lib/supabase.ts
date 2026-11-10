import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

let supabaseClient: SupabaseClient | undefined

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseUrl) {
    throw new Error(
      "Supabase configuration error: NEXT_PUBLIC_SUPABASE_URL is not set. Add it to the project environment variables.",
    )
  }

  if (!supabaseAnonKey) {
    throw new Error(
      "Supabase configuration error: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Add it to the project environment variables.",
    )
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  }

  return supabaseClient
}
