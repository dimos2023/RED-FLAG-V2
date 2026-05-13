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

/** Browser-only: filled from root layout so client code works even if NEXT_PUBLIC_* were not inlined into the JS bundle (e.g. some Vercel / env ordering cases). */
let clientPublicEnvOverride: { url: string; anonKey: string } | null = null;

export function setSupabasePublicEnvOverride(
  env: { url: string; anonKey: string } | null,
): void {
  if (typeof window === "undefined") {
    return;
  }
  if (env?.url?.trim() && env?.anonKey?.trim()) {
    clientPublicEnvOverride = {
      url: env.url.trim(),
      anonKey: env.anonKey.trim(),
    };
    return;
  }
  clientPublicEnvOverride = null;
}

export function getSupabasePublicEnv(): {
  url: string;
  anonKey: string;
} | null {
  if (
    clientPublicEnvOverride?.url &&
    clientPublicEnvOverride?.anonKey
  ) {
    const url: string = trimEnvValue(clientPublicEnvOverride.url);
    const anonKey: string = trimEnvValue(clientPublicEnvOverride.anonKey);
    if (url && anonKey) {
      return { url, anonKey };
    }
  }
  const url: string = trimEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey: string = trimEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !anonKey) {
    return null;
  }
  return { url, anonKey };
}
