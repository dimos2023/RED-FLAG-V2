"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";

export default function PostOAuthPage() {
  const router = useRouter();
  const { isArabic } = useLanguage();
  const { user, isAdmin, isAdminRoleResolved, isHydrated } = useAuth();
  const copy = useMemo(
    () =>
      isArabic
        ? { working: "جاري إتمام تسجيل الدخول…" }
        : { working: "Finishing sign-in…" },
    [isArabic],
  );
  const lastUserIdRef = useRef<string | undefined>(undefined);
  const postOAuthNavigatedRef = useRef<boolean>(false);
  useEffect(() => {
    const uid: string | undefined = user?.id;
    if (uid !== lastUserIdRef.current) {
      lastUserIdRef.current = uid;
      postOAuthNavigatedRef.current = false;
    }
  }, [user?.id]);
  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    if (!user?.id) {
      if (!postOAuthNavigatedRef.current) {
        postOAuthNavigatedRef.current = true;
        router.replace("/login?error=oauth_no_session");
      }
      return;
    }
    if (!isAdminRoleResolved) {
      return;
    }
    if (!postOAuthNavigatedRef.current) {
      postOAuthNavigatedRef.current = true;
      router.replace(isAdmin ? "/admin/requests" : "/dashboard");
    }
  }, [isHydrated, user?.id, isAdmin, isAdminRoleResolved, router]);
  return (
    <div className="min-h-dvh bg-transparent">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col items-center px-4 py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-red-500" />
        <p className="mt-6 text-center text-sm text-slate-400">
          {copy.working}
        </p>
      </main>
    </div>
  );
}
