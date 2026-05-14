import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export function createSupabaseBrowserClient(): SupabaseClient | null {
  const env = getSupabasePublicEnv();
  if (!env) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[supabase:browser] missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY (and no layout override)",
      );
    }
    return null;
  }
  if (process.env.NODE_ENV === "development") {
    try {
      console.log(
        "[supabase:browser] project host",
        new URL(env.url).hostname,
      );
    } catch {
      /* ignore */
    }
  }
  return createBrowserClient(env.url, env.anonKey);
}
