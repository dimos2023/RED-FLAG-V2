import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { fetchAppAdminMembershipWithTimeout } from "@/lib/supabase/app_admin_lookup";

/**
 * Verifies the current cookie session against public.app_admins (same RLS as the browser).
 */
export async function POST(): Promise<NextResponse> {
  const isDev: boolean = process.env.NODE_ENV === "development";
  try {
    const env = getSupabasePublicEnv();
    if (!env) {
      console.warn(
        "[admin-verify] missing env: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
      );
      return NextResponse.json(
        { ok: false, hasAdminRow: false, reason: "missing_env" },
        { status: 200 },
      );
    }
    try {
      const host: string = new URL(env.url).hostname;
      console.log("[admin-verify] Supabase project host", host);
    } catch {
      console.warn("[admin-verify] invalid NEXT_PUBLIC_SUPABASE_URL");
    }
    const cookieStore = await cookies();
    const supabase = createServerClient(env.url, env.anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            /* ignore when cookies are read-only; middleware may refresh session */
          }
        },
      },
    });
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    console.log("[admin-verify] auth.getUser", {
      userId: user?.id ?? null,
      email: user?.email ?? null,
      authError: authErr?.message ?? null,
    });
    if (authErr || !user?.id) {
      return NextResponse.json({
        ok: false,
        hasAdminRow: false,
        reason: "no_session",
        ...(isDev ? { debug: { authError: authErr?.message ?? null } } : {}),
      });
    }
    const outcome = await fetchAppAdminMembershipWithTimeout(supabase, user.id);
    const hasAdminRow: boolean = outcome.isAdmin;
    console.log("[admin-verify] public.app_admins", {
      queriedUserId: user.id,
      hasAdminRow,
      timedOut: outcome.timedOut,
    });
    return NextResponse.json({
      ok: true,
      hasAdminRow,
      adminLookupTimedOut: outcome.timedOut,
      ...(isDev
        ? {
            debug: {
              userId: user.id,
              email: user.email,
              adminLookupTimedOut: outcome.timedOut,
            },
          }
        : {}),
    });
  } catch (err: unknown) {
    const msg: string = err instanceof Error ? err.message : String(err);
    console.error("[admin-verify] unexpected error", msg);
    return NextResponse.json(
      {
        ok: false,
        hasAdminRow: false,
        reason: "server_error",
        ...(isDev ? { debug: { message: msg } } : {}),
      },
      { status: 200 },
    );
  }
}
