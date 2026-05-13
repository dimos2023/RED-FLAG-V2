function trimEnvValue(value: string | undefined): string {
  let t: string = (value ?? "").trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

export function getSupabasePublicEnv(): {
  url: string;
  anonKey: string;
} | null {
  const url: string = trimEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey: string = trimEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !anonKey) {
    return null;
  }
  return { url, anonKey };
}

/** Opt-in mock auth without Supabase (local-only). Default: off — use real Supabase from `.env.local`. */
export function isAuthDemoEnabled(): boolean {
  return trimEnvValue(process.env.NEXT_PUBLIC_AUTH_DEMO).toLowerCase() === "true";
}
