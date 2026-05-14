import type { UserProfile } from "@/types";

export type ProfileRowForAccess = {
  full_name: string | null;
  full_legal_name: string | null;
  phone: string | null;
  shipping_line1: string | null;
  shipping_city: string | null;
  shipping_country: string | null;
  national_id_number?: string | null;
  national_id_storage_path: unknown;
  company_legal_name: string | null;
  company_address_line1: string | null;
  company_city: string | null;
  company_country: string | null;
  company_location_note: string | null;
  verification_status?: string | null;
  is_verified: boolean | null;
};

function nationalIdDigitsCount(value: string | null | undefined): number {
  if (!value?.trim()) {
    return 0;
  }
  return value.replace(/\D/g, "").length;
}

function nationalPathsNonEmpty(raw: unknown): boolean {
  if (raw == null) {
    return false;
  }
  if (Array.isArray(raw)) {
    return raw.some(
      (p: unknown): p is string =>
        typeof p === "string" && p.trim().length > 0,
    );
  }
  if (typeof raw === "string") {
    return raw.trim().length > 0;
  }
  return false;
}

export function isCompanyProfileRow(row: ProfileRowForAccess): boolean {
  return Boolean(row.company_legal_name?.trim());
}

export function isProfileRegistrationComplete(
  row: ProfileRowForAccess | null,
): boolean {
  if (!row) {
    return false;
  }
  if (isCompanyProfileRow(row)) {
    return Boolean(
      row.company_legal_name?.trim() &&
        row.company_address_line1?.trim() &&
        row.company_city?.trim() &&
        row.company_country?.trim() &&
        nationalPathsNonEmpty(row.national_id_storage_path),
    );
  }
  return Boolean(
    (row.full_legal_name?.trim() || row.full_name?.trim()) &&
      row.phone?.trim() &&
      row.shipping_line1?.trim() &&
      row.shipping_city?.trim() &&
      row.shipping_country?.trim() &&
      nationalIdDigitsCount(row.national_id_number) >= 8 &&
      nationalPathsNonEmpty(row.national_id_storage_path),
  );
}

export function isVerificationApproved(
  row: ProfileRowForAccess | null,
): boolean {
  if (!row) {
    return false;
  }
  if (row.verification_status === "verified") {
    return true;
  }
  if (
    row.verification_status === "pending" ||
    row.verification_status === "rejected"
  ) {
    return false;
  }
  return Boolean(row.is_verified);
}

export function profileRowFromUserProfile(
  user: UserProfile | null,
): ProfileRowForAccess | null {
  if (!user) {
    return null;
  }
  const paths: unknown =
    user.nationalIdStoragePaths && user.nationalIdStoragePaths.length > 0
      ? user.nationalIdStoragePaths
      : user.nationalIdStoragePath ?? null;
  return {
    full_name: user.fullName ?? null,
    full_legal_name: user.fullLegalName ?? null,
    phone: user.phone ?? null,
    shipping_line1: user.shippingLine1 ?? null,
    shipping_city: user.shippingCity ?? null,
    shipping_country: user.shippingCountry ?? null,
    national_id_number: user.nationalIdNumber ?? null,
    national_id_storage_path: paths,
    company_legal_name: user.companyLegalName ?? null,
    company_address_line1: user.companyAddressLine1 ?? null,
    company_city: user.companyCity ?? null,
    company_country: user.companyCountry ?? null,
    company_location_note: user.companyLocationNote ?? null,
    verification_status: user.verificationStatus ?? null,
    is_verified: user.isVerified,
  };
}

export function userProfileAllowsVerifiedAccess(user: {
  verificationStatus?: "pending" | "verified" | "rejected";
  isVerified?: boolean;
}): boolean {
  if (user.verificationStatus === "verified") {
    return true;
  }
  if (
    user.verificationStatus === "pending" ||
    user.verificationStatus === "rejected"
  ) {
    return false;
  }
  return Boolean(user.isVerified);
}

export function isAuthPublicPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "") {
    return true;
  }
  const prefixes: string[] = [
    "/login",
    "/register",
    "/auth/",
    "/api/",
    "/complete-registration",
    "/site-blocked",
  ];
  if (prefixes.some((p: string) => pathname.startsWith(p))) {
    return true;
  }
  if (pathname === "/about" || pathname.startsWith("/about/")) {
    return true;
  }
  if (pathname === "/policies" || pathname.startsWith("/policies/")) {
    return true;
  }
  return false;
}

export function requiresVerifiedProfile(pathname: string): boolean {
  if (pathname.startsWith("/dashboard")) {
    return true;
  }
  if (pathname.startsWith("/search")) {
    return true;
  }
  if (pathname.startsWith("/report")) {
    return true;
  }
  return false;
}
