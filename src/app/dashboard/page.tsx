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
        searchGuideTitle: "كيف يعمل البحث وقراءة النتيجة",
        searchGuideIntro:
          "يمكنك البحث بعدة طرق حسب الحقول المتاحة في صفحة البحث (مثل الاسم أو المعرف أو غيرها). النتيجة تُعرض بلون وتسمية توضّح ما إذا وُجدت مطابقات.",
        searchGuideRedLabel: "REDFLAG",
        searchGuideRedBody:
          "عندما يكون للبحث نتائج أو معلومات مرتبطة، تظهر كلمة REDFLAG باللون الأحمر كتنبيه.",
        searchGuideGreenLabel: "GREENFLAG",
        searchGuideGreenBody:
          "عندما لا توجد نتائج للبحث، تظهر GREENFLAG باللون الأخضر.",
        searchGuidePaidTitle: "عرض البيانات التفصيلية والإرسال للبريد",
        searchGuidePaidBody:
          "إذا ظهرت نتيجة وترغب في الاطلاع على البيانات التي تثبت ذلك، يتطلب ذلك دفع رسوم عرض البيانات. بعد إتمام الدفع يُرسل المحتوى المعتمد إلى البريد الإلكتروني المسجل على حسابك.",
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
        searchGuideTitle: "How search works and how to read the result",
        searchGuideIntro:
          "You can search in several ways using the fields available on the search page (for example name, identifier, or others). The outcome is shown with a label and color that reflect whether anything matched.",
        searchGuideRedLabel: "REDFLAG",
        searchGuideRedBody:
          "When the search returns related information or matches, the word REDFLAG appears in red as a warning.",
        searchGuideGreenLabel: "GREENFLAG",
        searchGuideGreenBody:
          "When there are no results for your search, GREENFLAG appears in green.",
        searchGuidePaidTitle: "Detailed data and delivery to your email",
        searchGuidePaidBody:
          "If you see a result and want the data that backs it up, you pay a fee to unlock the detailed disclosure. After payment, the approved content is sent to the email address registered on your account.",
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
          <section
            className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/50 p-6 sm:p-8"
            aria-labelledby="dashboard-search-guide-heading"
          >
            <h2
              id="dashboard-search-guide-heading"
              className="text-base font-semibold text-slate-100 sm:text-lg"
            >
              {copy.searchGuideTitle}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              {copy.searchGuideIntro}
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4">
                <p className="text-lg font-bold tracking-wide text-red-500">
                  {copy.searchGuideRedLabel}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {copy.searchGuideRedBody}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/15 p-4">
                <p className="text-lg font-bold tracking-wide text-emerald-400">
                  {copy.searchGuideGreenLabel}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {copy.searchGuideGreenBody}
                </p>
              </div>
            </div>
            <div className="mt-6 rounded-xl border border-amber-900/35 bg-amber-950/20 p-4">
              <h3 className="text-sm font-semibold text-amber-200">
                {copy.searchGuidePaidTitle}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {copy.searchGuidePaidBody}
              </p>
            </div>
          </section>
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
