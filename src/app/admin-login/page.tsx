"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { ADMIN_OAUTH_FORBIDDEN_MESSAGE_AR } from "@/lib/admin_oauth_gate";

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const { signInWithGoogle, hasSupabase, isHydrated } = useAuth();
  const { isArabic } = useLanguage();
  const [googleError, setGoogleError] = useState<string>("");
  const reason: string | null = searchParams.get("reason");
  const queryError: string = useMemo(() => {
    if (reason === "forbidden") {
      return ADMIN_OAUTH_FORBIDDEN_MESSAGE_AR;
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
            "الدخول إلى لوحة الإدارة متاح فقط عبر حساب Google المصرّح به.",
          google: "المتابعة بحساب Google",
          googlePending: "جاري التوجيه…",
          googleFail: "تعذر بدء تسجيل الدخول بـ Google.",
          noSupabase: "Supabase غير مهيأ في البيئة الحالية.",
        }
      : {
          title: "Admin login",
          subtitle:
            "Admin access is available only through the authorized Google account.",
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
