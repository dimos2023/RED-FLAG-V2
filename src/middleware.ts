import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Edge middleware pipeline:
 * 1. `updateSession` — Supabase cookie refresh + admin intruder block.
 * 2. `profileSessionGate` — defined in `src/lib/supabase/profile_session_gate.ts` and
 *    **invoked from `updateSession`**. It loads `public.profiles` (including
 *    `national_id_storage_path` and `verification_status`). Users without an uploaded ID
 *    or missing required fields → `/complete-registration?reason=incomplete`.
 *    Users not yet verified → `/complete-registration?reason=unverified`.
 */

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch {
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
