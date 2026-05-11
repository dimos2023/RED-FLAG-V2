import type { SupabaseClient } from "@supabase/supabase-js";
import { TERMS_VERSION } from "@/lib/terms_of_service";
import type { AccountType } from "@/types";

export type UpsertRegistrationProfileInput =
  | {
      userId: string;
      accountType: "individual";
      phone: string;
      fullLegalName: string;
      shippingLine1: string;
      shippingLine2: string;
      shippingCity: string;
      shippingRegion: string;
      shippingPostalCode: string;
      shippingCountry: string;
      nationalIdStoragePath: string;
    }
  | {
      userId: string;
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
      commercialRegistryStoragePaths: string[];
    };

export async function upsertRegistrationProfile(
  supabase: SupabaseClient,
  input: UpsertRegistrationProfileInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const base: Record<string, unknown> = {
    id: input.userId,
    account_type: input.accountType,
    terms_version: TERMS_VERSION,
    is_verified: false,
  };
  if (input.accountType === "individual") {
    const row: Record<string, unknown> = {
      ...base,
      phone: input.phone.trim(),
      full_legal_name: input.fullLegalName.trim(),
      shipping_line1: input.shippingLine1.trim(),
      shipping_line2: input.shippingLine2.trim() || null,
      shipping_city: input.shippingCity.trim(),
      shipping_region: input.shippingRegion.trim() || null,
      shipping_postal_code: input.shippingPostalCode.trim() || null,
      shipping_country: input.shippingCountry.trim(),
      national_id_storage_path: input.nationalIdStoragePath,
      commercial_registry: null,
      company_email: null,
      company_legal_name: null,
      company_address_line1: null,
      company_address_line2: null,
      company_city: null,
      company_region: null,
      company_postal_code: null,
      company_country: null,
      company_location_note: null,
      commercial_registry_storage_paths: null,
    };
    const { error } = await supabase
      .from("profiles")
      .upsert(row, { onConflict: "id" });
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true };
  }
  const row: Record<string, unknown> = {
    ...base,
    phone: null,
    commercial_registry: input.commercialRegistry.trim(),
    company_email: input.companyEmail.trim(),
    company_legal_name: input.companyLegalName.trim(),
    company_address_line1: input.companyAddressLine1.trim(),
    company_address_line2: input.companyAddressLine2.trim() || null,
    company_city: input.companyCity.trim(),
    company_region: input.companyRegion.trim() || null,
    company_postal_code: input.companyPostalCode.trim() || null,
    company_country: input.companyCountry.trim(),
    company_location_note: input.companyLocationNote.trim(),
    commercial_registry_storage_paths:
      input.commercialRegistryStoragePaths.length > 0
        ? input.commercialRegistryStoragePaths
        : null,
    full_legal_name: null,
    shipping_line1: null,
    shipping_line2: null,
    shipping_city: null,
    shipping_region: null,
    shipping_postal_code: null,
    shipping_country: null,
    national_id_storage_path: null,
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
  params: {
    phone?: string;
    commercialRegistry?: string;
    companyEmail?: string;
    accountType: AccountType;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const patch: Record<string, unknown> = {
    is_verified: true,
  };
  if (params.accountType === "individual" && params.phone !== undefined) {
    patch.phone = params.phone.trim();
  }
  if (params.accountType === "company") {
    if (params.commercialRegistry !== undefined) {
      patch.commercial_registry = params.commercialRegistry.trim();
    }
    if (params.companyEmail !== undefined) {
      patch.company_email = params.companyEmail.trim();
    }
  }
  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId);
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
