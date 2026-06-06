"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { VerifiedGate } from "@/components/verified-gate";
import {
  RequestEvidenceModal,
  type EvidenceRequestHit,
} from "@/components/request-evidence-modal";
import { useLanguage } from "@/contexts/language-context";
import SearchFlagModal, { type PublicSearchMatchUI } from "@/components/SearchFlagModal";

type SearchResult = {
  id: string;
  entityName: string;
  commercialRegistrationNumber: string | null;
  phoneNumber: string | null;
  logoImageUrl: string | null;
  summary: string;
  hasEvidence: boolean;
  evidenceFeeCents: number;
  createdAt?: string | null;
};

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isArabic } = useLanguage();
  const [query, setQuery] = useState<string>(searchParams?.get("q") ?? "");
  const [active, setActive] = useState<EvidenceRequestHit | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [flag, setFlag] = useState<"idle" | "red" | "green">("idle");
  const [modalOpenFlag, setModalOpenFlag] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [pending, setPending] = useState<boolean>(false);
  const copy = isArabic
    ? {
        title: "بحث السجل",
        subtitle:
          "يتم عرض بيانات غير حساسة فقط. الأدلة تبقى خاصة حتى إتمام الوصول المدفوع. يظهر في النتائج فقط ما وافق عليه المسؤول من لوحة الإدارة.",
        placeholder: "ابحث باسم الكيان أو رقم السجل أو رقم الهاتف أو نص من العنوان/الملاحظات.",
        searching: "جاري البحث…",
        search: "بحث",
        minChars: "يرجى إدخال حرفين على الأقل.",
        failed: "فشل البحث. حاول مرة أخرى.",
        green: "🟢 راية خضراء",
        greenMsg: "لا توجد سجلات عامة أو بلاغات لهذا الكيان حاليًا.",
        red: "🔴 راية حمراء",
        cr: "السجل",
        phone: "الهاتف",
        gated:
          "يظهر الملخص العام فقط. ملفات الأدلة محمية ولا تُعرض بدون إتمام الوصول.",
        request: "طلب الوصول للأدلة",
      }
    : {
        title: "Registry search",
        subtitle:
          "Results show non-sensitive metadata only. Evidence remains in a private vault until purchased. Only administrator-approved reports appear here (pending reports stay in the admin queue until reviewed).",
        placeholder: "Search by entity name, registration number, phone, or text from address/notes.",
        searching: "Searching…",
        search: "Search",
        minChars: "Please enter at least 2 characters.",
        failed: "Search failed. Try again.",
        green: "🟢 GREEN-FLAG",
        greenMsg:
          "No public records or reports found for this entity at this time.",
        red: "🔴 RED-FLAG",
        cr: "CR",
        phone: "Phone",
        gated:
          "Public summary only. Evidence files are protected and never displayed without successful access workflow.",
        request: "Request Evidence Access",
      };

  async function executeSearch(queryText: string): Promise<void> {
    const q: string = queryText.trim();
    if (q.length < 2) {
      setFlag("idle");
      setMessage(copy.minChars);
      setResults([]);
      return;
    }
    setPending(true);
    setMessage("");
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q }),
    });
    const payload = (await response.json()) as {
      message?: string;
      flag?: "red" | "green";
      results?: SearchResult[];
    };
    setPending(false);
    if (response.status === 401) {
      router.push("/login?reason=mandatory-search");
      return;
    }
    if (!response.ok) {
      setFlag("idle");
      setResults([]);
      setMessage(payload.message ?? copy.failed);
      return;
    }
    const nextFlag = (payload.flag as "red" | "green" | undefined) ?? "green";
    setFlag(nextFlag);
    setResults(payload.results ?? []);
    // open modal for both green and red states
    if (nextFlag === "green" || nextFlag === "red") {
      setModalOpenFlag(true);
    } else {
      setModalOpenFlag(false);
    }
    setMessage(payload.message ?? "");
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void executeSearch(query);
    const encoded: string = encodeURIComponent(query.trim());
    router.replace(`/search${encoded ? `?q=${encoded}` : ""}`);
  }

  useEffect(() => {
    const fromUrl: string = (searchParams?.get("q") ?? "").trim();
    if (fromUrl.length >= 2) {
      setQuery(fromUrl);
      void executeSearch(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-dvh bg-transparent">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <VerifiedGate>
          <h1 className="text-2xl font-bold text-slate-50">{copy.title}</h1>
          <p className="mt-2 text-sm text-slate-400">
            {copy.subtitle}
          </p>
          <form onSubmit={handleSubmit} className="mt-6">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="search"
                placeholder={copy.placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 outline-none ring-red-500/0 transition focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
              />
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60 sm:min-w-28"
              >
                {pending ? copy.searching : copy.search}
              </button>
            </div>
          </form>

          {message ? (
            <p className="mt-4 text-sm text-slate-300">{message}</p>
          ) : null}

          {/* modal will show green/red results */}

          <ul className="mt-6 space-y-3">
            {results.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-slate-100">
                    {copy.red} · {row.entityName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {copy.cr}: {row.commercialRegistrationNumber ?? "—"} · {copy.phone}:{" "}
                    {row.phoneNumber ?? "—"}
                  </p>
                  <p className="mt-1 max-w-2xl text-xs text-slate-500">
                    {row.summary}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {copy.gated}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!row.hasEvidence}
                  onClick={() => {
                    setActive({
                      id: row.id,
                      displayName: row.entityName,
                      hasEvidence: row.hasEvidence,
                      evidenceFeeCents: row.evidenceFeeCents,
                    });
                    setModalOpen(true);
                  }}
                  className="w-full rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-950/70 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:shrink-0"
                >
                  {copy.request}
                </button>
              </li>
            ))}
          </ul>
        </VerifiedGate>
      </main>
      <RequestEvidenceModal
        hit={active}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setActive(null);
        }}
      />
      <SearchFlagModal
        open={modalOpenFlag}
        flag={flag === "idle" ? "idle" : flag}
        results={(results as unknown as PublicSearchMatchUI[]) ?? []}
        isArabic={isArabic}
        onClose={() => {
          setModalOpenFlag(false);
          // reset search state so user can start again
          setFlag("idle");
          setResults([]);
          setMessage("");
          setQuery("");
          // remove query param from URL
          router.replace(`/search`);
        }}
      />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-transparent">
          <SiteHeader />
          <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
            <div className="h-32 animate-pulse rounded-xl bg-slate-900/80" />
          </main>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
