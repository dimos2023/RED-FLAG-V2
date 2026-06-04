import type { SupabaseClient, User } from "@supabase/supabase-js";
import { TERMS_VERSION } from "@/lib/terms_of_service";
import {
  hasGoogleIdentity,
  resolveGoogleDisplayName,
} from "@/lib/supabase/google_profile_sync";
import { upsertPublicProfileRowResilient } from "@/lib/supabase/profiles_mutation_resilience";

export type GoogleRegistrationSeed = {
  email: string;
  fullLegalName: string;
  countryHint: string | null;
  phoneHint: string | null;
};

const LOCALE_COUNTRY_NAMES: Record<string, string> = {
  EG: "Egypt",
  SA: "Saudi Arabia",
  AE: "United Arab Emirates",
  US: "United States",
  GB: "United Kingdom",
};

function readMetaString(
  meta: Record<string, unknown>,
  key: string,
): string | null {
  const value: unknown = meta[key];
  if (typeof value !== "string") {
    return null;
  }
  const trimmed: string = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function extractGoogleRegistrationSeed(user: User): GoogleRegistrationSeed {
  const meta: Record<string, unknown> = (user.user_metadata ??
    {}) as Record<string, unknown>;
  const fullLegalName: string =
    resolveGoogleDisplayName(user) ??
    readMetaString(meta, "email")?.split("@")[0] ??
    "Google User";
  const locale: string | null = readMetaString(meta, "locale");
  let countryHint: string | null = null;
  if (locale !== null) {
    const parts: string[] = locale.split("-");
    if (parts.length >= 2) {
      const region: string = parts[parts.length - 1].toUpperCase();
      countryHint = LOCALE_COUNTRY_NAMES[region] ?? region;
    }
  }
  const phoneHint: string | null =
    readMetaString(meta, "phone_number") ?? readMetaString(meta, "phone");
  return {
    email: user.email?.trim() ?? readMetaString(meta, "email") ?? "",
    fullLegalName,
    countryHint,
    phoneHint,
  };
}

export function isGoogleIdentityVerifiedInAuth(user: User | null): boolean {
  if (user === null || !hasGoogleIdentity(user)) {
    return false;
  }
  const meta: Record<string, unknown> = (user.user_metadata ??
    {}) as Record<string, unknown>;
  return meta.google_identity_verified === true;
}

/**
 * After Google OAuth: persist name/email, accept terms metadata, mark profile verified.
 * Does not call `app_admins`. Independent of manual national-ID upload flow.
 */
export async function completeGoogleOAuthRegistration(
  supabase: SupabaseClient,
  user: User,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!hasGoogleIdentity(user)) {
    return { ok: true };
  }
  if (isGoogleIdentityVerifiedInAuth(user)) {
    return { ok: true };
  }
  const seed: GoogleRegistrationSeed = extractGoogleRegistrationSeed(user);
  const ts: string = new Date().toISOString();
  const row: Record<string, unknown> = {
    id: user.id,
    email: seed.email || user.email,
    full_name: seed.fullLegalName,
    full_legal_name: seed.fullLegalName,
    updated_at: ts,
    is_verified: true,
    verification_status: "verified",
  };
  if (seed.countryHint) {
    row.shipping_country = seed.countryHint;
  }
  if (seed.phoneHint) {
    row.phone = seed.phoneHint;
  }
  const upserted = await upsertPublicProfileRowResilient(supabase, row);
  if (!upserted.ok) {
    return { ok: false, message: upserted.message };
  }
  const { error: metaError } = await supabase.auth.updateUser({
    data: {
      account_type: "individual",
      terms_version: TERMS_VERSION,
      is_verified: true,
      google_identity_verified: true,
      full_name: seed.fullLegalName,
      phone: seed.phoneHint ?? undefined,
    },
  });
  if (metaError) {
    return { ok: false, message: metaError.message };
  }
  return { ok: true };
}
