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
  const [fullLegalName, setFullLegalName] = useState<string>("");
  const [shippingLine1, setShippingLine1] = useState<string>("");
  const [shippingLine2, setShippingLine2] = useState<string>("");
  const [shippingCity, setShippingCity] = useState<string>("");
  const [shippingRegion, setShippingRegion] = useState<string>("");
  const [shippingPostalCode, setShippingPostalCode] = useState<string>("");
  const [shippingCountry, setShippingCountry] = useState<string>("");
  const [companyLegalName, setCompanyLegalName] = useState<string>("");
  const [crNumber, setCrNumber] = useState<string>("");
  const [companyAddressLine1, setCompanyAddressLine1] = useState<string>("");
  const [companyAddressLine2, setCompanyAddressLine2] = useState<string>("");
  const [companyCity, setCompanyCity] = useState<string>("");
  const [companyRegion, setCompanyRegion] = useState<string>("");
  const [companyPostalCode, setCompanyPostalCode] = useState<string>("");
  const [companyCountry, setCompanyCountry] = useState<string>("");
  const [companyLocationNote, setCompanyLocationNote] = useState<string>("");
  const [companyRegistryFiles, setCompanyRegistryFiles] = useState<File[]>([]);
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
    if (accountType === "individual") {
      if (!fullLegalName.trim()) {
        setError("Enter your full legal name as shown on your ID.");
        return;
      }
      if (!phone.trim()) {
        setError("Phone number is required for verification.");
        return;
      }
      if (!shippingLine1.trim() || !shippingCity.trim() || !shippingCountry.trim()) {
        setError(
          "Shipping address (street, city, country) is required for delivery verification.",
        );
        return;
      }
      if (!nationalIdFile) {
        setError("Upload a photo or scan of your national / government ID.");
        return;
      }
    } else {
      if (!companyLegalName.trim()) {
        setError("Company legal name is required.");
        return;
      }
      if (!crNumber.trim()) {
        setError("Commercial registration (CR) number is required.");
        return;
      }
      if (!companyEmail.trim()) {
        setError("Official company email is required.");
        return;
      }
      if (
        !companyAddressLine1.trim() ||
        !companyCity.trim() ||
        !companyCountry.trim()
      ) {
        setError(
          "Registered address (street, city, country) is required.",
        );
        return;
      }
      if (!companyLocationNote.trim()) {
        setError(
          "Describe the company location (area, landmark, or map link).",
        );
        return;
      }
      if (companyRegistryFiles.length === 0) {
        setError("Upload at least one commercial registry / trade license document.");
        return;
      }
    }
    setPending(true);
    const ok: boolean = await signUpDemo({
      email,
      password,
      accountType,
      hasAcceptedTerms: acceptedTerms,
    });
    if (!ok) {
      setPending(false);
      setError("Could not create account. Check Supabase configuration.");
      return;
    }
    const sb = createSupabaseBrowserClient();
    if (sb) {
      const { data: authData } = await sb.auth.getUser();
      if (authData.user) {
        if (accountType === "individual" && nationalIdFile) {
          const up = await uploadFraudEvidence(sb, authData.user.id, {
            file: nationalIdFile,
            reportFolder: "national-id",
          });
          if (!up.ok) {
            setPending(false);
            setError(
              `Account created but ID upload failed: ${up.message}. Try again from support.`,
            );
            return;
          }
        }
        if (accountType === "company") {
          for (const file of companyRegistryFiles) {
            const up = await uploadFraudEvidence(sb, authData.user.id, {
              file,
              reportFolder: "commercial-registry",
            });
            if (!up.ok) {
              setPending(false);
              setError(
                `Account created but document upload failed: ${up.message}.`,
              );
              return;
            }
          }
        }
      }
    }
    setPending(false);
    setStep("verify");
  }

  async function handleIndividualVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!phone.trim()) {
      setError("Phone number is missing. Use Back from the account step.");
      return;
    }
    if (otp !== DEMO_OTP) {
      setError(`Invalid OTP. Demo code: ${DEMO_OTP}`);
      return;
    }
    setPending(true);
    const verified: boolean = await completeVerificationDemo({ phone });
    if (!verified) {
      setPending(false);
      setError("Verification failed. Try signing in again.");
      return;
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
      <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
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
            {accountType === "individual" ? (
              <div className="space-y-4 border-t border-slate-800 pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Identity & shipping (verification)
                </p>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Full legal name (as on ID)
                  </label>
                  <input
                    type="text"
                    required
                    value={fullLegalName}
                    onChange={(e) => setFullLegalName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Phone (for OTP)
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
                    Address line 1
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingLine1}
                    onChange={(e) => setShippingLine1(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Address line 2 (optional)
                  </label>
                  <input
                    type="text"
                    value={shippingLine2}
                    onChange={(e) => setShippingLine2(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      City
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingCity}
                      onChange={(e) => setShippingCity(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      State / region
                    </label>
                    <input
                      type="text"
                      value={shippingRegion}
                      onChange={(e) => setShippingRegion(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Postal code
                    </label>
                    <input
                      type="text"
                      value={shippingPostalCode}
                      onChange={(e) => setShippingPostalCode(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Country
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingCountry}
                      onChange={(e) => setShippingCountry(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                    National / government ID (image or PDF)
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
              </div>
            ) : (
              <div className="space-y-4 border-t border-slate-800 pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Company & registry
                </p>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Company legal name
                  </label>
                  <input
                    type="text"
                    required
                    value={companyLegalName}
                    onChange={(e) => setCompanyLegalName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Commercial registration (CR) number
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
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Registered address — line 1
                  </label>
                  <input
                    type="text"
                    required
                    value={companyAddressLine1}
                    onChange={(e) => setCompanyAddressLine1(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Registered address — line 2 (optional)
                  </label>
                  <input
                    type="text"
                    value={companyAddressLine2}
                    onChange={(e) => setCompanyAddressLine2(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      City
                    </label>
                    <input
                      type="text"
                      required
                      value={companyCity}
                      onChange={(e) => setCompanyCity(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      State / region
                    </label>
                    <input
                      type="text"
                      value={companyRegion}
                      onChange={(e) => setCompanyRegion(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Postal code
                    </label>
                    <input
                      type="text"
                      value={companyPostalCode}
                      onChange={(e) => setCompanyPostalCode(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Country
                    </label>
                    <input
                      type="text"
                      required
                      value={companyCountry}
                      onChange={(e) => setCompanyCountry(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Location details (area, landmark, map link, coordinates)
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={companyLocationNote}
                    onChange={(e) => setCompanyLocationNote(e.target.value)}
                    className="mt-1 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Commercial registry / trade license (PDF or images, multiple files allowed)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    required
                    onChange={(e) =>
                      setCompanyRegistryFiles(
                        Array.from(e.target.files ?? []),
                      )
                    }
                    className="mt-1 w-full text-sm text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-slate-200"
                  />
                  {companyRegistryFiles.length > 0 ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {companyRegistryFiles.length} file(s) selected
                    </p>
                  ) : null}
                </div>
              </div>
            )}
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
              Enter the SMS code sent to{" "}
              <span className="font-medium text-slate-300">{phone}</span>. Demo
              OTP:{" "}
              <code className="text-slate-400">{DEMO_OTP}</code>. Your ID and
              shipping details were saved when you created the account.
            </p>
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
            <p className="text-xs text-slate-500">
              Registry documents were uploaded with your application. Confirm the
              official inbox below.
            </p>
            <p className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
              <span className="font-medium text-slate-300">
                {companyLegalName}
              </span>
              <br />
              CR: {crNumber} · {companyEmail}
              <br />
              {companyAddressLine1}
              {companyAddressLine2 ? `, ${companyAddressLine2}` : ""}, {companyCity},{" "}
              {companyCountry}
            </p>
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
          <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
            <div className="h-56 animate-pulse rounded-xl bg-slate-900/80" />
          </main>
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
