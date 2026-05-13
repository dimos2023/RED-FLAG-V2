"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  startTransition,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { SiteHeader } from "@/components/site-header";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { formatSignInError } from "@/lib/format_sign_in_error";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInDemo, signInWithGoogle, isHydrated } = useAuth();
  const { isArabic } = useLanguage();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [googleError, setGoogleError] = useState<string>("");
  const [pending, setPending] = useState<boolean>(false);
  const gateMessage = useMemo(() => {
    return searchParams.get("reason") === "mandatory-search"
      ? "Mandatory registration required to search or access data."
      : "";
  }, [searchParams]);
  const oauthError = useMemo(() => {
    const raw: string | null = searchParams.get("error");
    if (!raw) {
      return "";
    }
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [searchParams]);
  const copy = isArabic
    ? {
        title: "تسجيل الدخول",
        newUser: "حساب جديد؟",
        register: "إنشاء حساب",
        email: "البريد الإلكتروني",
        password: "كلمة المرور",
        submitting: "جاري الدخول…",
        submit: "دخول",
        invalid: "بيانات الدخول غير صحيحة أو الحساب غير موجود.",
        divider: "أو",
        google: "المتابعة بحساب Google",
        googlePending: "جاري التوجيه…",
        googleFail: "تعذر بدء تسجيل الدخول بـ Google.",
      }
    : {
        title: "Sign in",
        newUser: "New user?",
        register: "Register",
        email: "Email",
        password: "Password",
        submitting: "Signing in…",
        submit: "Sign in",
        invalid: "Invalid credentials or account not found.",
        divider: "or",
        google: "Continue with Google",
        googlePending: "Redirecting…",
        googleFail: "Could not start Google sign-in.",
      };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPending(true);
    const signInResult = await signInDemo(email, password);
    if (!signInResult.ok) {
      setPending(false);
      setError(formatSignInError(isArabic, signInResult.message));
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      const { data: userData } = await supabase.auth.getUser();
      const uid: string | undefined = userData.user?.id;
      if (uid) {
        const { data: adminRow, error: adminError } = await supabase
          .from("app_admins")
          .select("user_id")
          .eq("user_id", uid)
          .maybeSingle();
        if (!adminError && adminRow) {
          setPending(false);
          startTransition(() => {
            router.push("/admin/requests");
          });
          return;
        }
      }
    }
    setPending(false);
    startTransition(() => {
      router.push("/dashboard");
    });
  }

  return (
    <div className="min-h-dvh bg-transparent">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-bold text-slate-50">{copy.title}</h1>
        <p className="mt-2 text-sm text-slate-400">
          {copy.newUser}{" "}
          <Link href="/register" className="text-red-400 hover:underline">
            {copy.register}
          </Link>
        </p>
        {gateMessage ? (
          <p className="mt-3 rounded-lg border border-amber-800/70 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
            {gateMessage}
          </p>
        ) : null}
        {oauthError ? (
          <p className="mt-3 rounded-lg border border-red-900/50 bg-red-950/25 px-3 py-2 text-sm text-red-300" role="alert">
            {oauthError}
          </p>
        ) : null}
        {!isHydrated ? (
          <div className="mt-8 h-40 animate-pulse rounded-xl bg-slate-900" />
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
          >
            <GoogleSignInButton
              label={copy.google}
              pendingLabel={copy.googlePending}
              disabled={pending}
              onPress={async () => {
                setGoogleError("");
                setError("");
                const result = await signInWithGoogle();
                if (!result.ok) {
                  setGoogleError(result.message || copy.googleFail);
                }
              }}
            />
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wide">
                <span className="bg-slate-900/90 px-3 text-slate-500">
                  {copy.divider}
                </span>
              </div>
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium uppercase tracking-wide text-slate-500"
              >
                {copy.email}
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-red-500/0 transition focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium uppercase tracking-wide text-slate-500"
              >
                {copy.password}
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
              />
            </div>
            {error ? (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            ) : null}
            {googleError ? (
              <p className="text-sm text-red-400" role="alert">
                {googleError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
            >
              {pending ? copy.submitting : copy.submit}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-transparent">
          <SiteHeader />
          <main className="mx-auto max-w-md px-4 py-16">
            <div className="h-44 animate-pulse rounded-xl bg-slate-900/80" />
          </main>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
