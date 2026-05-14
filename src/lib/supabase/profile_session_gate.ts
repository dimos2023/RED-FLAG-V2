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
    const { data: adm } = await supabase
      .schema("public")
      .from("app_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
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
  let rowResponse = await supabase
    .schema("public")
    .from("profiles")
    .select(PROFILE_GATE_SELECT_PRIMARY)
    .eq("id", user.id)
    .maybeSingle();
  if (rowResponse.error) {
    console.log("[profileSessionGate] primary profiles select failed", {
      userId: user.id,
      message: rowResponse.error.message,
      code: rowResponse.error.code,
    });
    rowResponse = await supabase
      .schema("public")
      .from("profiles")
      .select(PROFILE_GATE_SELECT_FALLBACK)
      .eq("id", user.id)
      .maybeSingle();
  }
  if (rowResponse.error) {
    console.log("[profileSessionGate] fallback profiles select failed", {
      userId: user.id,
      message: rowResponse.error.message,
      code: rowResponse.error.code,
    });
    rowResponse = await supabase
      .schema("public")
      .from("profiles")
      .select(PROFILE_GATE_SELECT_MINIMAL)
      .eq("id", user.id)
      .maybeSingle();
  }
  if (rowResponse.error) {
    console.log("[profileSessionGate] minimal profiles select failed", {
      userId: user.id,
      message: rowResponse.error.message,
      code: rowResponse.error.code,
    });
  }
  const row = rowResponse.data;
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
