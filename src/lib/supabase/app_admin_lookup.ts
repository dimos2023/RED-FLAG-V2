import type { SupabaseClient } from "@supabase/supabase-js";

/** Bounded wait so a broken `app_admins` RLS/policy (e.g. infinite recursion) cannot hang the UI or middleware. */
export const APP_ADMIN_LOOKUP_TIMEOUT_MS: number = 10_000;

export type AppAdminLookupOutcome = {
  isAdmin: boolean;
  timedOut: boolean;
};

/**
 * Single `app_admins` read with a wall-clock timeout. No retries. On timeout or any failure → `isAdmin: false`.
 * Independent of `profiles` reads/writes.
 */
export async function fetchAppAdminMembershipWithTimeout(
  supabase: SupabaseClient,
  userId: string,
): Promise<AppAdminLookupOutcome> {
  const query = Promise.resolve(
    supabase
      .schema("public")
      .from("app_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ).then(
    (r) => ({ kind: "result" as const, r }),
    (err: unknown) => ({
      kind: "thrown" as const,
      message: err instanceof Error ? err.message : String(err),
    }),
  );
  const outcome = await Promise.race([
    query,
    new Promise<{ kind: "timeout" }>((resolve) => {
      setTimeout(() => {
        resolve({ kind: "timeout" });
      }, APP_ADMIN_LOOKUP_TIMEOUT_MS);
    }),
  ]);
  if (outcome.kind === "timeout") {
    console.warn(
      "[app_admin_lookup] app_admins query timed out; treating as non-admin",
      { userId },
    );
    return { isAdmin: false, timedOut: true };
  }
  if (outcome.kind === "thrown") {
    console.warn(
      "[app_admin_lookup] app_admins query threw; treating as non-admin",
      { userId, message: outcome.message },
    );
    return { isAdmin: false, timedOut: false };
  }
  const { data, error } = outcome.r;
  if (error) {
    console.warn(
      "[app_admin_lookup] app_admins select error; treating as non-admin",
      { userId, message: error.message },
    );
    return { isAdmin: false, timedOut: false };
  }
  return { isAdmin: data !== null, timedOut: false };
}
