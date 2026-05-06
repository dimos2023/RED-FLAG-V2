"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/contexts/auth-context";

type VerifiedGateProps = {
  children: ReactNode;
};

export function VerifiedGate({ children }: VerifiedGateProps) {
  const { user, isHydrated, isAdmin, isAdminRoleResolved } = useAuth();
  if (!isHydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-red-500" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-100">
          Registration required
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          You cannot access this area without a verified account.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/register"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }
  if (!isAdminRoleResolved) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-red-500" />
      </div>
    );
  }
  if (!user.isVerified && !isAdmin) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-900/50 bg-amber-950/20 p-8 text-center">
        <h2 className="text-lg font-semibold text-amber-200">
          Verification required
        </h2>
        <p className="mt-2 text-sm text-amber-100/70">
          Complete phone / ID or company verification before using search and
          reporting features.
        </p>
        <Link
          href="/register"
          className="mt-6 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-black hover:bg-amber-500"
        >
          Continue verification
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
