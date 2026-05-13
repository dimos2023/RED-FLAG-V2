export const ADMIN_OAUTH_FORBIDDEN_MESSAGE_AR: string =
  "عفواً، هذا الحساب لا يمتلك صلاحيات الوصول للوحة الإدارة";

export const ADMIN_OAUTH_ALLOWED_EMAIL: string = "ahmedashry.hh@gmail.com";

/** Legacy id kept for documentation; admin gate is email-only. */
export const ADMIN_OAUTH_ALLOWED_USER_ID: string =
  "5598b6ac-07ad-4e5a-af1d-2d16fb68af9d";

export function normalizeAdminOAuthEmail(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function isAdminOAuthEmailAllowed(email: string | undefined): boolean {
  const em: string = normalizeAdminOAuthEmail(email);
  const allowedEm: string = ADMIN_OAUTH_ALLOWED_EMAIL.trim().toLowerCase();
  return em === allowedEm;
}

export function isAdminOAuthIdentityAllowed(
  _userId: string,
  email: string | undefined,
): boolean {
  return isAdminOAuthEmailAllowed(email);
}
