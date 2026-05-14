import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import {
  isAuthPublicPath,
  isProfileRegistrationComplete,
  isVerificationApproved,
  requiresVerifiedProfile,
  type ProfileRowForAccess,
} from "@/lib/profile_completeness";
import {
  PROFILE_GATE_SELECT_FALLBACK,
  PROFILE_GATE_SELECT_MINIMAL,
  PROFILE_GATE_SELECT_PRIMARY,
} from "@/lib/supabase/profile_columns";
import { fetchAppAdminMembershipWithTimeout } from "@/lib/supabase/app_admin_lookup";

function copyCookies(from: NextResponse, to: NextResponse): void {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
}

export async function profileSessionGate(
  request: NextRequest,
  baseResponse: NextResponse,
  supabase: SupabaseClient,
  user: User,
): Promise<NextResponse | null> {
  const pathname: string = request.nextUrl.pathname;
  if (isAuthPublicPath(pathname)) {
    return null;
  }
  if (pathname.startsWith("/admin")) {
    const outcome = await fetchAppAdminMembershipWithTimeout(supabase, user.id);
    const adm: { user_id: string } | null = outcome.isAdmin
      ? { user_id: user.id }
      : null;
    if (outcome.timedOut) {
      console.warn("[profileSessionGate] app_admins timed out; denying admin route", {
        userId: user.id,
      });
    }
    if (!adm) {
      const redirect: NextResponse = NextResponse.redirect(
        new URL("/dashboard?notice=forbidden-admin", request.url),
      );
      copyCookies(baseResponse, redirect);
      return redirect;
    }
    return null;
  }
  if (!requiresVerifiedProfile(pathname)) {
    return null;
  }
  console.log("[profileSessionGate] checking protected route", {
    pathname,
    userId: user.id,
  });
  type GateRow = Record<string, unknown> | null;
  let row: GateRow = null;
  let lastMessage: string | null = null;
  const selectors: string[] = [
    PROFILE_GATE_SELECT_PRIMARY,
    PROFILE_GATE_SELECT_FALLBACK,
    PROFILE_GATE_SELECT_MINIMAL,
  ];
  for (const sel of selectors) {
    try {
      const rowResponse = await supabase
        .schema("public")
        .from("profiles")
        .select(sel)
        .eq("id", user.id)
        .maybeSingle();
      if (rowResponse.error) {
        lastMessage = rowResponse.error.message;
        console.log("[profileSessionGate] profiles select failed", {
          userId: user.id,
          message: rowResponse.error.message,
          code: rowResponse.error.code,
        });
        continue;
      }
      row = rowResponse.data as GateRow;
      break;
    } catch (err: unknown) {
      lastMessage = err instanceof Error ? err.message : String(err);
      console.log("[profileSessionGate] profiles select threw", {
        userId: user.id,
        message: lastMessage,
      });
    }
  }
  if (row === null && lastMessage !== null) {
    console.log("[profileSessionGate] all profile gate selects exhausted", {
      userId: user.id,
      message: lastMessage,
    });
  }
  const prof: ProfileRowForAccess | null = row as ProfileRowForAccess | null;
  console.log("[profileSessionGate] public.profiles row", {
    userId: user.id,
    hasRow: Boolean(prof),
    verificationStatus: prof?.verification_status ?? null,
    registrationComplete: isProfileRegistrationComplete(prof),
  });
  if (!isProfileRegistrationComplete(prof)) {
    console.log("[profileSessionGate] redirect incomplete → /complete-registration", {
      userId: user.id,
      pathname,
    });
    const redirect: NextResponse = NextResponse.redirect(
      new URL("/complete-registration?reason=incomplete", request.url),
    );
    copyCookies(baseResponse, redirect);
    return redirect;
  }
  if (!isVerificationApproved(prof)) {
    console.log("[profileSessionGate] redirect unverified → /complete-registration", {
      userId: user.id,
      pathname,
      verificationStatus: prof?.verification_status ?? null,
    });
    const redirect: NextResponse = NextResponse.redirect(
      new URL("/complete-registration?reason=unverified", request.url),
    );
    copyCookies(baseResponse, redirect);
    return redirect;
  }
  console.log("[profileSessionGate] access allowed", { userId: user.id, pathname });
  return null;
}
