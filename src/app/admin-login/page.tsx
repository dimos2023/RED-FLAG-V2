"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { AdminAccessDeniedModal } from "@/components/admin-access-denied-modal";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithGoogle, hasSupabase, isHydrated } = useAuth();
  const { isArabic } = useLanguage();
  const [googleError, setGoogleError] = useState<string>("");
  const reason: string | null = searchParams.get("reason");
  const showForbiddenModal: boolean = reason === "forbidden";
  const queryError: string = useMemo(() => {
    if (reason === "forbidden") {
      return "";
    }
    if (reason === "no_admin_role") {
      return isArabic
        ? "البريد مصرح به لكن حسابك غير مضاف كمسؤول في النظام. راجع إعداد قاعدة البيانات."
        : "This email is allowed but your user is not listed in app_admins. Update the database.";
    }
    if (reason === "session") {
      return isArabic
        ? "انتهت الجلسة أو تعذر التحقق منها. حاول تسجيل الدخول مرة أخرى."
        : "Your session could not be verified. Please sign in again.";
    }
    if (reason === "config") {
      return isArabic
        ? "إعدادات الخادم غير مكتملة. راجع إعدادات Supabase."
        : "Server configuration is incomplete. Check Supabase environment variables.";
    }
    return "";
  }, [reason, isArabic]);
  const copy = useMemo(() => {
    return isArabic
      ? {
          title: "دخول الإدارة",
          subtitle:
            "الدخول إلى لوحة الإدارة متاح فقط للبريد ahmedashry.hh@gmail.com عبر Google.",
          google: "المتابعة بحساب Google",
          googlePending: "جاري التوجيه…",
          googleFail: "تعذر بدء تسجيل الدخول بـ Google.",
          noSupabase: "Supabase غير مهيأ في البيئة الحالية.",
        }
      : {
          title: "Admin login",
          subtitle:
            "Admin access is only for ahmedashry.hh@gmail.com via Google.",
          google: "Continue with Google",
          googlePending: "Redirecting…",
          googleFail: "Could not start Google sign-in.",
          noSupabase: "Supabase is not configured in this environment.",
        };
  }, [isArabic]);
  async function handleGoogleSignIn(): Promise<void> {
    setGoogleError("");
    if (!hasSupabase) {
      setGoogleError(copy.noSupabase);
      return;
    }
    const result = await signInWithGoogle({
      nextPath: "/auth/post-admin-oauth",
    });
    if (!result.ok) {
      setGoogleError(result.message);
    }
  }
  function handleCloseForbiddenModal(): void {
    router.replace("/admin-login");
  }
  return (
    <div className="min-h-dvh bg-transparent">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-bold text-slate-50">{copy.title}</h1>
        <p className="mt-2 text-sm text-slate-400">{copy.subtitle}</p>
        <div className="mt-8 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          {queryError ? (
            <p className="text-sm text-red-400" role="alert">
              {queryError}
            </p>
          ) : null}
          {googleError ? (
            <p className="text-sm text-red-400" role="alert">
              {googleError}
            </p>
          ) : null}
          <GoogleSignInButton
            label={copy.google}
            pendingLabel={copy.googlePending}
            disabled={!isHydrated || !hasSupabase}
            onPress={handleGoogleSignIn}
          />
        </div>
      </main>
      <AdminAccessDeniedModal
        open={showForbiddenModal}
        isArabic={isArabic}
        onClose={handleCloseForbiddenModal}
      />
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-transparent">
          <SiteHeader />
          <main className="mx-auto max-w-md px-4 py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-red-500" />
          </main>
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
