"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { SiteHeader } from "@/components/site-header";
import { useLanguage } from "@/contexts/language-context";

function SiteBlockedContent() {
  const searchParams = useSearchParams();
  const { isArabic } = useLanguage();
  const reason: string | null = searchParams?.get("reason") ?? null;
  const copy = useMemo(() => {
    const isBan: boolean =
      reason === "admin_permanent" || reason === "admin_abuse";
    if (isArabic) {
      return {
        title: isBan ? "تم الحظر نهائياً" : "الوصول مقيد",
        body: isBan
          ? "تم حظر حسابك نهائياً من استخدام الموقع بسبب تكرار محاولة الدخول غير المصرح بها إلى لوحة الإدارة."
          : "لا يمكنك استخدام الموقع من هذا الحساب. إذا كان ذلك خطأ، تواصل مع الدعم.",
        home: "العودة للرئيسية",
      };
    }
    return {
      title: isBan ? "Permanently blocked" : "Access restricted",
      body: isBan
        ? "Your account has been permanently blocked from this site after repeated unauthorized attempts to access the admin panel."
        : "You cannot use the site with this account. If this is a mistake, contact support.",
      home: "Back to home",
    };
  }, [isArabic, reason]);
  return (
    <div className="min-h-dvh bg-transparent">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-red-400">{copy.title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">{copy.body}</p>
        <Link
          href="/"
          className="mt-10 inline-block rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
        >
          {copy.home}
        </Link>
      </main>
    </div>
  );
}

export default function SiteBlockedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-transparent">
          <SiteHeader />
          <main className="mx-auto max-w-lg px-4 py-24">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-red-500" />
          </main>
        </div>
      }
    >
      <SiteBlockedContent />
    </Suspense>
  );
}
