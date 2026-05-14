import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import {
  isAuthPublicPath,
  isProfileRegistrationComplete,
  isVerificationApproved,
  requiresVerifiedProfile,
  type ProfileRowForAccess,
} from "@/lib/profile_completeness";

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
        new URL("/admin-login", request.url),
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
  const { data: row } = await supabase
    .schema("public")
    .from("profiles")
    .select(
      "full_name, full_legal_name, phone, shipping_line1, shipping_city, shipping_country, national_id_number, national_id_storage_path, company_legal_name, company_address_line1, company_city, company_country, company_location_note, verification_status, is_verified",
    )
    .eq("id", user.id)
    .maybeSingle();
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
