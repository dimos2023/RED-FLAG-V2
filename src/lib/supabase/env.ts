export function getSupabasePublicEnv(): {
  url: string;
  anonKey: string;
} | null {
  const url: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey: string | undefined =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.trim() || !anonKey?.trim()) {
    return null;
  }
  return { url: url.trim(), anonKey: anonKey.trim() };
}
