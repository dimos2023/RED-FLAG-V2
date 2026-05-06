"use client";

import { startTransition, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { formatSignInError } from "@/lib/format_sign_in_error";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const { refreshSessionFromSupabase } = useAuth();
  const { isArabic } = useLanguage();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [pending, setPending] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const copy = useMemo(() => {
    return isArabic
      ? {
          title: "دخول الإدارة",
          subtitle:
            "هذه الصفحة مخصصة لحساب الإدارة لمراجعة الطلبات والموافقة أو الرفض.",
          email: "البريد الإلكتروني",
          password: "كلمة المرور",
          button: "دخول لوحة الإدارة",
          loading: "جاري التحقق…",
          invalid: "بيانات الدخول غير صحيحة.",
          notAdmin: "تم تسجيل الدخول لكن الحساب ليس ضمن صلاحيات الإدارة.",
          noSupabase: "Supabase غير مهيأ في البيئة الحالية.",
        }
      : {
          title: "Admin Login",
          subtitle:
            "This page is dedicated to the admin account for reviewing requests and approving/rejecting them.",
          email: "Email",
          password: "Password",
          button: "Open Admin Panel",
          loading: "Verifying…",
          invalid: "Invalid admin credentials.",
          notAdmin: "Signed in, but this account is not listed as admin.",
          noSupabase: "Supabase is not configured in this environment.",
        };
  }, [isArabic]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPending(true);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setPending(false);
      setError(copy.noSupabase);
      return;
    }
    const loginEmail: string = email.trim();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });
    if (signInError) {
      setPending(false);
      setError(formatSignInError(isArabic, signInError.message));
      return;
    }
    await refreshSessionFromSupabase();
    const { data: userData } = await supabase.auth.getUser();
    const uid: string | undefined = userData.user?.id;
    if (!uid) {
      setPending(false);
      setError(copy.invalid);
      return;
    }
    const { data: adminRow, error: adminError } = await supabase
      .from("app_admins")
      .select("user_id")
      .eq("user_id", uid)
      .maybeSingle();
    setPending(false);
    if (adminError || !adminRow) {
      setError(copy.notAdmin);
      return;
    }
    startTransition(() => {
      router.push("/admin/requests");
    });
  }

  return (
    <div className="min-h-dvh bg-transparent">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-bold text-slate-50">{copy.title}</h1>
        <p className="mt-2 text-sm text-slate-400">{copy.subtitle}</p>
        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
        >
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
              {copy.email}
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
              {copy.password}
            </label>
            <input
              type="password"
              required
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
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
          >
            {pending ? copy.loading : copy.button}
          </button>
        </form>
      </main>
    </div>
  );
}

