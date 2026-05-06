"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { VerifiedGate } from "@/components/verified-gate";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";

export default function DashboardPage() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const copy = isArabic
    ? {
        title: "لوحة التحكم",
        signedInAs: "مسجل باسم",
        fileReport: "تقديم بلاغ",
        openSearch: "فتح البحث",
        cards: [
          {
            title: "خزنة الأدلة",
            body: "الملفات مخصصة خاصة فقط مع سياسات RLS وروابط موقعة في Supabase.",
          },
          {
            title: "وصول مدفوع",
            body: "البحث يظهر بيانات وصفية فقط، بينما الأدلة خلف مسار دفع.",
          },
          {
            title: "الامتثال القانوني",
            body: "بوابة الشروط القانونية ومسؤولية الرافع تُسجل أثناء التسجيل.",
          },
        ],
      }
    : {
        title: "Dashboard",
        signedInAs: "Signed in as",
        fileReport: "File a report",
        openSearch: "Open search",
        cards: [
          {
            title: "Evidence vault",
            body: "Uploads are private objects. Wire Row Level Security and signed URLs in Supabase.",
          },
          {
            title: "Monetized disclosure",
            body: "Search exposes metadata only. Evidence access is paywalled per report.",
          },
          {
            title: "Compliance posture",
            body: "ToS gate + hosting disclaimer logged at registration time.",
          },
        ],
      };
  return (
    <div className="min-h-dvh bg-transparent">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <VerifiedGate>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-50">{copy.title}</h1>
              <p className="mt-1 text-sm text-slate-400">
                {copy.signedInAs}{" "}
                <span className="text-slate-200">{user?.email}</span> ·{" "}
                <span className="capitalize text-red-400/90">
                  {user?.accountType}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/report"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
              >
                {copy.fileReport}
              </Link>
              <Link
                href="/search"
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900"
              >
                {copy.openSearch}
              </Link>
            </div>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {copy.cards.map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-slate-800 bg-slate-900/40 p-5"
              >
                <h2 className="text-sm font-semibold text-slate-200">
                  {card.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </VerifiedGate>
      </main>
    </div>
  );
}
