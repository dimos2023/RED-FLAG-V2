/**
 * PostgREST `select` lists for `public.profiles`.
 * Primary includes newer columns; if the remote DB lags migrations, callers fall back to `HYDRATE_FALLBACK`.
 */

/** Client profile hydrate (auth UI, stored profile merge). */
export const PROFILE_HYDRATE_SELECT_PRIMARY: string =
  "email,is_verified,full_name,updated_at,verification_status,full_legal_name,phone,national_id_storage_path,national_id_number,shipping_line1,shipping_line2,shipping_city,shipping_region,shipping_postal_code,shipping_country,company_legal_name,company_address_line1,company_address_line2,company_city,company_region,company_postal_code,company_country,company_location_note";

/** Omits newer columns if migrations have not been applied yet. */
export const PROFILE_HYDRATE_SELECT_FALLBACK: string =
  "email,is_verified,full_name,updated_at,full_legal_name,phone,national_id_storage_path,shipping_line1,shipping_line2,shipping_city,shipping_region,shipping_postal_code,shipping_country,company_legal_name,company_address_line1,company_address_line2,company_city,company_region,company_postal_code,company_country,company_location_note";

/** Middleware gate: completeness + verification. */
export const PROFILE_GATE_SELECT_PRIMARY: string =
  "full_name,full_legal_name,phone,shipping_line1,shipping_city,shipping_country,national_id_number,national_id_storage_path,company_legal_name,company_address_line1,company_city,company_country,company_location_note,verification_status,is_verified";

/** Gate without `national_id_number` (column added in a later migration). */
export const PROFILE_GATE_SELECT_FALLBACK: string =
  "full_name,full_legal_name,phone,shipping_line1,shipping_city,shipping_country,national_id_storage_path,company_legal_name,company_address_line1,company_city,company_country,company_location_note,verification_status,is_verified";

/** Gate without `national_id_number` and `verification_status` (legacy databases). */
export const PROFILE_GATE_SELECT_MINIMAL: string =
  "full_name,full_legal_name,phone,shipping_line1,shipping_city,shipping_country,national_id_storage_path,company_legal_name,company_address_line1,company_city,company_country,company_location_note,is_verified";
