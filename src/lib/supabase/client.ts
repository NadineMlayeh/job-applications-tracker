import { createBrowserClient } from "@supabase/ssr";

// Client-side Supabase instance (uses the public anon key, safe for browser).
// Row Level Security (see supabase/schema.sql) ensures users only see their own data.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
