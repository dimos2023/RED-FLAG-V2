import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * Verifies the current cookie session against public.app_admins (same RLS as the browser).
 * Logs to the Next.js server terminal (dev/prod) for debugging admin login issues.
 */
export async function POST(): Promise<NextResponse> {
  const env = getSupabasePublicEnv();
  const isDev: boolean = process.env.NODE_ENV === "development";
  if (!env) {
    console.warn(
      "[admin-verify] missing env: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
    return NextResponse.json(
      { ok: false, hasAdminRow: false, reason: "missing_env" },
      { status: 500 },
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
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
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
  const { data: adminRow, error: adminErr } = await supabase
    .schema("public")
    .from("app_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  console.log("[admin-verify] public.app_admins", {
    queriedUserId: user.id,
    row: adminRow ?? null,
    error: adminErr?.message ?? null,
    code: adminErr?.code ?? null,
  });
  const hasAdminRow: boolean = Boolean(adminRow?.user_id) && !adminErr;
  return NextResponse.json({
    ok: true,
    hasAdminRow,
    ...(isDev
      ? {
          debug: {
            userId: user.id,
            email: user.email,
            adminRow: adminRow ?? null,
            adminError: adminErr?.message ?? null,
            adminCode: adminErr?.code ?? null,
          },
        }
      : {}),
  });
}
