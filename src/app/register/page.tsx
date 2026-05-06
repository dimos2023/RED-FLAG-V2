"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/contexts/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { uploadFraudEvidence } from "@/lib/supabase/storage";
import { TERMS_FULL_TEXT, TERMS_VERSION } from "@/lib/terms_of_service";
import type { AccountType } from "@/types";

const DEMO_OTP = "123456";

type Step = "terms" | "account" | "verify";

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUpDemo, completeVerificationDemo, user, isHydrated } =
    useAuth();
  const [step, setStep] = useState<Step>("terms");
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [nationalIdFile, setNationalIdFile] = useState<File | null>(null);
  const [crNumber, setCrNumber] = useState<string>("");
  const [companyEmail, setCompanyEmail] = useState<string>("");
  const [companyEmailConfirmed, setCompanyEmailConfirmed] =
    useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [pending, setPending] = useState<boolean>(false);
  const gateMessage = useMemo(() => {
    return searchParams.get("reason") === "mandatory-search"
      ? "Mandatory registration required to search or access data."
      : "";
  }, [searchParams]);

  async function handleAccountSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!acceptedTerms) {
      setError("You must accept the Terms of Service.");
      return;
    }
    setPending(true);
    const ok: boolean = await signUpDemo({
      email,
      password,
      accountType,
      hasAcceptedTerms: acceptedTerms,
    });
    setPending(false);
    if (!ok) {
      setError("Could not create account. Check Supabase configuration.");
      return;
    }
    setStep("verify");
  }

  async function handleIndividualVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (otp !== DEMO_OTP) {
      setError(`Invalid OTP. Demo code: ${DEMO_OTP}`);
      return;
    }
    if (!nationalIdFile) {
      setError("National ID document is required.");
      return;
    }
    setPending(true);
    const verified: boolean = await completeVerificationDemo({ phone });
    if (!verified) {
      setPending(false);
      setError("Verification failed. Try signing in again.");
      return;
    }
    const sb = createSupabaseBrowserClient();
    if (sb && nationalIdFile) {
      const { data: authData } = await sb.auth.getUser();
      if (authData.user) {
        const up = await uploadFraudEvidence(sb, authData.user.id, {
          file: nationalIdFile,
          reportFolder: "national-id",
        });
        if (!up.ok) {
          setError(
            `Account verified but ID upload failed: ${up.message}. You can retry from support.`,
          );
        }
      }
    }
    setPending(false);
    router.push("/dashboard");
  }

  async function handleCompanyVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!crNumber.trim()) {
      setError("Commercial registry number is required.");
      return;
    }
    if (!companyEmailConfirmed) {
      setError("Confirm that the official company email is verified.");
      return;
    }
    setPending(true);
    const verified: boolean = await completeVerificationDemo({
      commercialRegistry: crNumber,
      companyEmail,
    });
    setPending(false);
    if (!verified) {
      setError("Verification failed. Try signing in again.");
      return;
    }
    router.push("/dashboard");
  }

  useEffect(() => {
    if (isHydrated && user?.isVerified) {
      router.replace("/dashboard");
    }
  }, [isHydrated, user, router]);

  return (
    <div className="min-h-dvh bg-transparent">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-10 sm:py-14">
        <h1 className="text-2xl font-bold text-slate-50">Create account</h1>
        <p className="mt-2 text-sm text-slate-400">
          Already registered?{" "}
          <Link href="/login" className="text-red-400 hover:underline">
            Sign in
          </Link>
        </p>
        {gateMessage ? (
          <p className="mt-3 rounded-lg border border-amber-800/70 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
            {gateMessage}
          </p>
        ) : null}
        {!isHydrated ? (
          <div className="mt-8 h-96 animate-pulse rounded-2xl bg-slate-900" />
        ) : step === "terms" ? (
          <section className="mt-8 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Terms of Service
              </h2>
              <span className="text-xs text-slate-600">v{TERMS_VERSION}</span>
            </div>
            <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/80 p-4 text-xs leading-relaxed text-slate-400">
              {TERMS_FULL_TEXT.split("\n").map((line, i) => (
                <p key={i} className={line.trim() === "" ? "h-2" : "mb-2"}>
                  {line}
                </p>
              ))}
            </div>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-red-600 focus:ring-red-500"
              />
              <span>
                I have read and agree to the Terms of Service, including that I
                am solely responsible for uploaded data, the platform is a
                host and not a verifier of truth, and false reports may result in
                permanent bans and legal liability.
              </span>
            </label>
            <button
              type="button"
              disabled={!acceptedTerms}
              onClick={() => setStep("account")}
              className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
            </button>
          </section>
        ) : step === "account" ? (
          <form
            onSubmit={handleAccountSubmit}
            className="mt-8 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Account
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAccountType("individual")}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                  accountType === "individual"
                    ? "border-red-500/60 bg-red-950/40 text-red-200"
                    : "border-slate-700 text-slate-400 hover:border-slate-600"
                }`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => setAccountType("company")}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                  accountType === "company"
                    ? "border-red-500/60 bg-red-950/40 text-red-200"
                    : "border-slate-700 text-slate-400 hover:border-slate-600"
                }`}
              >
                Company
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep("terms")}
                className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
              >
                {pending ? "Creating…" : "Create & verify"}
              </button>
            </div>
          </form>
        ) : accountType === "individual" ? (
          <form
            onSubmit={handleIndividualVerify}
            className="mt-8 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Individual verification
            </h2>
            <p className="text-xs text-slate-500">
              Phone OTP (demo use{" "}
              <code className="text-slate-400">{DEMO_OTP}</code>) and national ID
              upload. Files go to your private Supabase bucket in production.
            </p>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                Phone number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                OTP
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                National ID (image/PDF)
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                required
                onChange={(e) =>
                  setNationalIdFile(e.target.files?.[0] ?? null)
                }
                className="mt-1 w-full text-sm text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-slate-200"
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
              {pending ? "Saving…" : "Complete verification"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleCompanyVerify}
            className="mt-8 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Company verification
            </h2>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                Commercial registry (CR)
              </label>
              <input
                type="text"
                required
                value={crNumber}
                onChange={(e) => setCrNumber(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                Official company email
              </label>
              <input
                type="email"
                required
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
              />
            </div>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={companyEmailConfirmed}
                onChange={(e) => setCompanyEmailConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-red-600"
              />
              <span>
                I confirm we control this inbox and have completed email
                verification (link simulated in demo).
              </span>
            </label>
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
              {pending ? "Saving…" : "Complete verification"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-transparent">
          <SiteHeader />
          <main className="mx-auto max-w-xl px-4 py-10 sm:py-14">
            <div className="h-56 animate-pulse rounded-xl bg-slate-900/80" />
          </main>
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
