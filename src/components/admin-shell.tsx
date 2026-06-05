"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/contexts/auth-context";
import { sanitizeInternalNextPath } from "@/lib/safe_next_path";

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const router = useRouter();
  const pathname: string = usePathname();
  const { user, isAdmin, isAdminRoleResolved, isHydrated, hasSupabase } =
    useAuth();
  const lastUserIdRef = useRef<string | undefined>(undefined);
  const loginRedirectSentRef = useRef<boolean>(false);
  const forbiddenRedirectSentRef = useRef<boolean>(false);

  useEffect(() => {
    const uid: string | undefined = user?.id;
    if (uid !== lastUserIdRef.current) {
      lastUserIdRef.current = uid;
      loginRedirectSentRef.current = false;
      forbiddenRedirectSentRef.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    if (!user?.id) {
      if (loginRedirectSentRef.current) {
        return;
      }
      loginRedirectSentRef.current = true;
      const loginUrl: URL = new URL("/login", window.location.origin);
      const nextPath: string =
        sanitizeInternalNextPath(pathname) ?? "/admin/requests";
      loginUrl.searchParams.set("next", nextPath);
      router.replace(`${loginUrl.pathname}${loginUrl.search}`);
      return;
    }
    if (!isAdminRoleResolved) {
      return;
    }
    if (!hasSupabase || !isAdmin) {
      if (forbiddenRedirectSentRef.current) {
        return;
      }
      forbiddenRedirectSentRef.current = true;
      router.replace("/dashboard?notice=forbidden-admin");
    }
  }, [
    isHydrated,
    user?.id,
    isAdmin,
    isAdminRoleResolved,
    hasSupabase,
    router,
    pathname,
  ]);

  if (
    !isHydrated ||
    !user?.id ||
    !hasSupabase ||
    !isAdminRoleResolved ||
    !isAdmin
  ) {
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
              href="/admin/users"
              className="text-slate-300 underline-offset-4 hover:text-white hover:underline"
            >
              Users
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
