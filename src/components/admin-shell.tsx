"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/contexts/auth-context";

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const router = useRouter();
  const { user, isAdmin, isAdminRoleResolved, isHydrated, isDemoMode, hasSupabase } =
    useAuth();

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    if (!user) {
      router.replace("/admin-login");
      return;
    }
    if (!isAdminRoleResolved) {
      return;
    }
    if (!hasSupabase || isDemoMode || !isAdmin) {
      router.replace("/admin-login");
    }
  }, [
    isHydrated,
    user,
    isAdmin,
    isAdminRoleResolved,
    isDemoMode,
    hasSupabase,
    router,
  ]);

  if (!isHydrated || !user || !hasSupabase || isDemoMode || !isAdminRoleResolved || !isAdmin) {
    return (
      <div className="min-h-dvh bg-transparent">
        <SiteHeader />
        <div className="flex min-h-[50vh] items-center justify-center px-4">
          <p className="text-sm text-slate-500">Checking access…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-transparent">
      <SiteHeader />
      <div className="border-b border-slate-800 bg-slate-900/40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
          <h1 className="text-sm font-semibold uppercase tracking-wide text-red-400/90">
            Admin
          </h1>
          <nav className="flex gap-3 text-sm">
            <Link
              href="/admin/requests"
              className="text-slate-300 underline-offset-4 hover:text-white hover:underline"
            >
              Report queue
            </Link>
            <Link
              href="/dashboard"
              className="text-slate-500 hover:text-slate-300"
            >
              Exit to app
            </Link>
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}
