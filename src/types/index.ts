export type AccountType = "individual" | "company";

export type ReportReviewStatus = "pending" | "approved" | "rejected";

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

export type UserProfile = {
  id: string;
  email: string;
  accountType: AccountType;
  hasAcceptedTerms: boolean;
  isVerified: boolean;
  phone?: string;
  commercialRegistry?: string;
  companyEmail?: string;
};
