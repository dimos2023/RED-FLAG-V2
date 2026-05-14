import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_PROFILE_MUTATION_STRIPS: number = 12;

/**
 * PostgREST often reports unknown columns as:
 * Could not find the 'national_id_number' column of 'profiles' in the schema cache
 */
function removeProfilesColumnMentionedInError(
  message: string,
  row: Record<string, unknown>,
): Record<string, unknown> | null {
  const match: RegExpMatchArray | null = message.match(
    /'([\w_]+)'\s+column\s+of\s+'profiles'/i,
  );
  if (match === null) {
    return null;
  }
  const columnName: string = match[1];
  if (!(columnName in row)) {
    return null;
  }
  const next: Record<string, unknown> = { ...row };
  delete next[columnName];
  return next;
}

export async function upsertPublicProfileRowResilient(
  supabase: SupabaseClient,
  row: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  let current: Record<string, unknown> = { ...row };
  for (let attempt = 0; attempt < MAX_PROFILE_MUTATION_STRIPS; attempt++) {
    try {
      const { error } = await supabase
        .schema("public")
        .from("profiles")
        .upsert(current, { onConflict: "id" });
      if (error === null) {
        return { ok: true };
      }
      const stripped: Record<string, unknown> | null =
        removeProfilesColumnMentionedInError(error.message, current);
      if (stripped === null) {
        return { ok: false, message: error.message };
      }
      current = stripped;
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : String(err);
      return { ok: false, message: msg };
    }
  }
  return { ok: false, message: "Profile upsert failed after column fallbacks." };
}

export async function updatePublicProfileRowResilient(
  supabase: SupabaseClient,
  userId: string,
  patch: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  let current: Record<string, unknown> = { ...patch };
  for (let attempt = 0; attempt < MAX_PROFILE_MUTATION_STRIPS; attempt++) {
    try {
      const { error } = await supabase
        .schema("public")
        .from("profiles")
        .update(current)
        .eq("id", userId);
      if (error === null) {
        return { ok: true };
      }
      const stripped: Record<string, unknown> | null =
        removeProfilesColumnMentionedInError(error.message, current);
      if (stripped === null) {
        return { ok: false, message: error.message };
      }
      current = stripped;
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : String(err);
      return { ok: false, message: msg };
    }
  }
  return { ok: false, message: "Profile update failed after column fallbacks." };
}

export async function insertPublicProfileRowResilient(
  supabase: SupabaseClient,
  row: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  let current: Record<string, unknown> = { ...row };
  for (let attempt = 0; attempt < MAX_PROFILE_MUTATION_STRIPS; attempt++) {
    try {
      const { error } = await supabase
        .schema("public")
        .from("profiles")
        .insert(current);
      if (error === null) {
        return { ok: true };
      }
      const stripped: Record<string, unknown> | null =
        removeProfilesColumnMentionedInError(error.message, current);
      if (stripped === null) {
        return { ok: false, message: error.message };
      }
      current = stripped;
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : String(err);
      return { ok: false, message: msg };
    }
  }
  return { ok: false, message: "Profile insert failed after column fallbacks." };
}
