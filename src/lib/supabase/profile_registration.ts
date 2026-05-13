import type { SupabaseClient } from "@supabase/supabase-js";

const nowIso: () => string = (): string => new Date().toISOString();

export type UpsertRegistrationProfileInput =
  | {
      userId: string;
      userEmail: string;
      accountType: "individual";
      phone: string;
      fullLegalName: string;
      shippingLine1: string;
      shippingLine2: string;
      shippingCity: string;
      shippingRegion: string;
      shippingPostalCode: string;
      shippingCountry: string;
      nationalIdStoragePaths: string[];
    }
  | {
      userId: string;
      userEmail: string;
      accountType: "company";
      commercialRegistry: string;
      companyEmail: string;
      companyLegalName: string;
      companyAddressLine1: string;
      companyAddressLine2: string;
      companyCity: string;
      companyRegion: string;
      companyPostalCode: string;
      companyCountry: string;
      companyLocationNote: string;
      nationalIdStoragePaths: string[];
    };

/**
 * Persists registration to `public.profiles`. `national_id_storage_path` is stored as `text[]`
 * (array of storage object paths). Password lives only in `auth.users`.
 */
export async function upsertRegistrationProfile(
  supabase: SupabaseClient,
  input: UpsertRegistrationProfileInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ts: string = nowIso();
  const paths: string[] =
    input.nationalIdStoragePaths.length > 0 ? input.nationalIdStoragePaths : [];
  if (input.accountType === "individual") {
    const row: Record<string, unknown> = {
      id: input.userId,
      email: input.userEmail.trim(),
      is_verified: false,
      full_name: input.fullLegalName.trim(),
      updated_at: ts,
      full_legal_name: input.fullLegalName.trim(),
      shipping_line1: input.shippingLine1.trim(),
      shipping_line2: input.shippingLine2.trim() || null,
      shipping_city: input.shippingCity.trim(),
      shipping_region: input.shippingRegion.trim() || null,
      shipping_postal_code: input.shippingPostalCode.trim() || null,
      shipping_country: input.shippingCountry.trim(),
      company_legal_name: null,
      company_address_line1: null,
      company_address_line2: null,
      company_city: null,
      company_region: null,
      company_postal_code: null,
      company_country: null,
      company_location_note: null,
      national_id_storage_path: paths.length > 0 ? paths : null,
    };
    const { error } = await supabase
      .from("profiles")
      .upsert(row, { onConflict: "id" });
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true };
  }
  const companyNote: string = [
    `CR: ${input.commercialRegistry.trim()}`,
    `Official company email: ${input.companyEmail.trim()}`,
    "",
    input.companyLocationNote.trim(),
  ].join("\n");
  const row: Record<string, unknown> = {
    id: input.userId,
    email: input.userEmail.trim(),
    is_verified: false,
    full_name: input.companyLegalName.trim(),
    updated_at: ts,
    full_legal_name: null,
    shipping_line1: null,
    shipping_line2: null,
    shipping_city: null,
    shipping_region: null,
    shipping_postal_code: null,
    shipping_country: null,
    company_legal_name: input.companyLegalName.trim(),
    company_address_line1: input.companyAddressLine1.trim(),
    company_address_line2: input.companyAddressLine2.trim() || null,
    company_city: input.companyCity.trim(),
    company_region: input.companyRegion.trim() || null,
    company_postal_code: input.companyPostalCode.trim() || null,
    company_country: input.companyCountry.trim(),
    company_location_note: companyNote,
    national_id_storage_path: paths.length > 0 ? paths : null,
  };
  const { error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "id" });
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

export async function markProfileVerified(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase
    .from("profiles")
    .update({
      is_verified: true,
      updated_at: nowIso(),
    })
    .eq("id", userId);
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
