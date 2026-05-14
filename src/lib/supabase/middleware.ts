/**
 * Supabase session refresh + security routing.
 * Calls `profileSessionGate` for `public.profiles` (ID upload + `verification_status`).
 */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { profileSessionGate } from "@/lib/supabase/profile_session_gate";

export { profileSessionGate } from "@/lib/supabase/profile_session_gate";

export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  const env = getSupabasePublicEnv();
  let response: NextResponse = NextResponse.next({ request });
  if (!env) {
    return response;
  }
  try {
    const supabase = createServerClient(env.url, env.anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const path: string = request.nextUrl.pathname;
    if (
      user?.email &&
      !path.startsWith("/site-blocked") &&
      !path.startsWith("/_next")
    ) {
      const normalized: string = user.email.trim().toLowerCase();
      const { data: strikeRow } = await supabase
        .schema("public")
        .from("admin_intruder_strikes")
        .select("permanently_blocked_at")
        .eq("email_normalized", normalized)
        .maybeSingle();
      if (strikeRow?.permanently_blocked_at) {
        await supabase.auth.signOut();
        const redirect: NextResponse = NextResponse.redirect(
          new URL("/site-blocked?reason=admin_permanent", request.url),
        );
        response.cookies.getAll().forEach((cookie) => {
          redirect.cookies.set(cookie.name, cookie.value);
        });
        return redirect;
      }
    }
    if (user) {
      const gated: NextResponse | null = await profileSessionGate(
        request,
        response,
        supabase,
        user,
      );
      if (gated) {
        return gated;
      }
    }
  } catch {
    /* Invalid env or transient Supabase client error — do not fail the request */
  }
  return response;
}
