"use client";

import { useAuth } from "@/contexts/auth-context";

export type AdminStatus = {
  /** True when `public.app_admins` contains the signed-in user's id. */
  isAdmin: boolean;
  /** False until the `app_admins` query finishes (avoid flashing the Admin tab). */
  isAdminResolved: boolean;
};

/**
 * Resolves admin role from `public.app_admins` via {@link AuthProvider} (background fetch after sign-in).
 */
export function useAdminStatus(): AdminStatus {
  const { isAdmin, isAdminRoleResolved } = useAuth();
  return { isAdmin, isAdminResolved: isAdminRoleResolved };
}
