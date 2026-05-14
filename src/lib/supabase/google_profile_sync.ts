import type { SupabaseClient, User } from "@supabase/supabase-js";
import { insertPublicProfileRowResilient } from "@/lib/supabase/profiles_mutation_resilience";

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
  const ts: string = new Date().toISOString();
  const patch: {
    email: string | null;
    updated_at: string;
    full_name?: string;
  } = {
    email: user.email ?? null,
    updated_at: ts,
  };
  if (fullName) {
    patch.full_name = fullName;
  }
  const { data: updatedRows, error: updateErr } = await supabase
    .schema("public")
    .from("profiles")
    .update(patch)
    .eq("id", user.id)
    .select("id");
  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }
  if (updatedRows && updatedRows.length > 0) {
    return { ok: true };
  }
  const inserted = await insertPublicProfileRowResilient(supabase, {
    id: user.id,
    email: user.email ?? null,
    is_verified: false,
    verification_status: "pending",
    full_name: fullName,
  });
  if (!inserted.ok) {
    return { ok: false, message: inserted.message };
  }
  return { ok: true };
}
