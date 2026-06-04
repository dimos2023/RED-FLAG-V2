export type AccountType = "individual" | "company";

export type ReportReviewStatus = "pending" | "approved" | "rejected";

export type ProfileVerificationStatus = "pending" | "verified" | "rejected";

export type FraudReportRow = {
  id: string;
  owner_id: string;
  subject_name: string;
  subject_phone: string | null;
  subject_cr: string | null;
  subject_address: string;
  review_status: ReportReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_note: string | null;
  logo_storage_path: string | null;
  created_at: string;
};

/**
 * Client-side profile shape merged from `auth.users` and `public.profiles`.
 * Maps to table columns (snake_case in DB): id → auth; email → profiles.email;
 * fullName → full_name; fullLegalName → full_legal_name; phone → phone;
 * shipping* → shipping_*; company* → company_*; nationalIdStoragePaths →
 * national_id_storage_path (text[]); nationalIdNumber → national_id_number;
 * isVerified / verificationStatus → is_verified / verification_status;
 * hasAcceptedTerms → auth user_metadata only (not a profiles column).
 */
export type UserProfile = {
  id: string;
  email: string;
  accountType: AccountType;
  hasAcceptedTerms: boolean;
  isVerified: boolean;
  verificationStatus?: ProfileVerificationStatus;
  fullName?: string;
  phone?: string;
  commercialRegistry?: string;
  companyEmail?: string;
  fullLegalName?: string;
  shippingLine1?: string;
  shippingLine2?: string;
  shippingCity?: string;
  shippingRegion?: string;
  shippingPostalCode?: string;
  shippingCountry?: string;
  companyLegalName?: string;
  companyAddressLine1?: string;
  companyAddressLine2?: string;
  companyCity?: string;
  companyRegion?: string;
  companyPostalCode?: string;
  companyCountry?: string;
  companyLocationNote?: string;
  nationalIdStoragePath?: string;
  nationalIdStoragePaths?: string[];
  /** National ID number as entered by the user (digits); used with OCR cross-check. */
  nationalIdNumber?: string;
  commercialRegistryStoragePaths?: string[];
  /** Set when the account completed Google OAuth onboarding (no manual ID form). */
  googleIdentityVerified?: boolean;
};
