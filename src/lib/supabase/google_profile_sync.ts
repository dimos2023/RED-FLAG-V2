import type { SupabaseClient, User } from "@supabase/supabase-js";

export function hasGoogleIdentity(user: User): boolean {
  const providers: unknown = user.app_metadata?.providers;
  if (Array.isArray(providers) && providers.includes("google")) {
    return true;
  }
  return (user.identities ?? []).some((row) => row.provider === "google");
}

export function resolveGoogleDisplayName(user: User): string | null {
  const meta: Record<string, unknown> = (user.user_metadata ??
    {}) as Record<string, unknown>;
  const candidates: unknown[] = [
    meta.full_name,
    meta.name,
    meta.user_name,
    meta.given_name,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return null;
}

export async function upsertProfileFromGoogleUser(
  supabase: SupabaseClient,
  user: User,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!hasGoogleIdentity(user)) {
    return { ok: true };
  }
  const fullName: string | null = resolveGoogleDisplayName(user);
  const row: Record<string, string | null> = {
    id: user.id,
    email: user.email ?? null,
    updated_at: new Date().toISOString(),
  };
  if (fullName) {
    row.full_name = fullName;
  }
  const { error } = await supabase.from("profiles").upsert(row, {
    onConflict: "id",
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
