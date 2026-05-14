"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { SiteHeader } from "@/components/site-header";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  clearPendingProfilePayload,
  filesToPendingPayload,
  pendingFileToFile,
  readPendingProfilePayload,
  writePendingProfilePayload,
  type PendingProfileFormV1,
} from "@/lib/register/pending_profile_storage";
import { requestNationalIdOcrGate } from "@/lib/register/ocr_gate";
import { uploadFraudEvidence } from "@/lib/supabase/storage";
import { upsertRegistrationProfile } from "@/lib/supabase/profile_registration";
import { resolveGoogleDisplayName } from "@/lib/supabase/google_profile_sync";
import { TERMS_FULL_TEXT, TERMS_VERSION } from "@/lib/terms_of_service";
import type { AccountType, UserProfile } from "@/types";

type Step = "terms" | "account" | "awaitEmail" | "verify";

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isArabic } = useLanguage();
  const { signUp, completeVerification, user, isHydrated, hasSupabase, signInWithGoogle } =
    useAuth();
  const [step, setStep] = useState<Step>("terms");
  const resumeAttemptedRef = useRef<boolean>(false);
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [individualIdentityConfirmed, setIndividualIdentityConfirmed] =
    useState<boolean>(false);
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
  const [registerPhase, setRegisterPhase] = useState<
    "idle" | "auth" | "upload" | "profile"
  >("idle");
  const gateMessage = useMemo(() => {
    return searchParams.get("reason") === "mandatory-search"
      ? "Mandatory registration required to search or access data."
      : "";
  }, [searchParams]);
  const oauthUrlError = useMemo(() => {
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
  const googleCopy = useMemo(
    () =>
      isArabic
        ? {
            divider: "أو",
            google: "التسجيل بواسطة Google",
            googlePending: "جاري التوجيه…",
            googleFail: "تعذر بدء تسجيل الدخول بـ Google.",
            googleHint:
              "بعد الدخول بـ Google أكمل التحقق من الهوية من هذه الصفحة إن لزم.",
          }
        : {
            divider: "or",
            google: "Continue with Google",
            googlePending: "Redirecting…",
            googleFail: "Could not start Google sign-in.",
            googleHint:
              "After Google sign-in, complete identity verification on this page if required.",
          },
    [isArabic],
  );
  const [googleOAuthError, setGoogleOAuthError] = useState<string>("");

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
    setRegisterPhase("auth");
    const registrationPartial: Partial<UserProfile> =
      accountType === "individual"
        ? {
            phone: phone.trim(),
            fullName: fullLegalName.trim(),
            fullLegalName: fullLegalName.trim(),
            shippingLine1: shippingLine1.trim(),
            shippingLine2: shippingLine2.trim(),
            shippingCity: shippingCity.trim(),
            shippingRegion: shippingRegion.trim(),
            shippingPostalCode: shippingPostalCode.trim(),
            shippingCountry: shippingCountry.trim(),
          }
        : {
            fullName: companyLegalName.trim(),
            commercialRegistry: crNumber.trim(),
            companyEmail: companyEmail.trim(),
            companyLegalName: companyLegalName.trim(),
            companyAddressLine1: companyAddressLine1.trim(),
            companyAddressLine2: companyAddressLine2.trim(),
            companyCity: companyCity.trim(),
            companyRegion: companyRegion.trim(),
            companyPostalCode: companyPostalCode.trim(),
            companyCountry: companyCountry.trim(),
            companyLocationNote: companyLocationNote.trim(),
          };
    const signUpResult = await signUp({
      email,
      password,
      accountType,
      hasAcceptedTerms: acceptedTerms,
      registration: registrationPartial,
    });
    if (!signUpResult.ok) {
      setPending(false);
      setRegisterPhase("idle");
      setError(signUpResult.message);
      return;
    }
    const sb = createSupabaseBrowserClient();
    const signedUpEmail: string = signUpResult.userEmail.trim();
    const userId: string = signUpResult.userId;
    if (!userId) {
      setPending(false);
      setRegisterPhase("idle");
      setError("Signup did not return a user id.");
      return;
    }
    if (sb && signUpResult.hasSession) {
      setRegisterPhase("upload");
      const { data: authData } = await sb.auth.getUser();
      let activeUserId: string = userId;
      if (authData.user?.id) {
        activeUserId = authData.user.id;
      }
      const googleDisplayName: string | null = authData.user
        ? resolveGoogleDisplayName(authData.user)
        : null;
      if (accountType === "individual" && nationalIdFile) {
        const gate = await requestNationalIdOcrGate({
          file: nationalIdFile,
          expectedLegalName: fullLegalName.trim(),
          googleDisplayName,
        });
        if (!gate.ok) {
          setPending(false);
          setRegisterPhase("idle");
          setError(gate.message);
          return;
        }
      }
      if (accountType === "company" && companyRegistryFiles.length > 0) {
        const gate = await requestNationalIdOcrGate({
          file: companyRegistryFiles[0],
          expectedLegalName: companyLegalName.trim(),
          googleDisplayName,
        });
        if (!gate.ok) {
          setPending(false);
          setRegisterPhase("idle");
          setError(gate.message);
          return;
        }
      }
      const storagePaths: string[] = [];
      if (accountType === "individual" && nationalIdFile) {
        const up = await uploadFraudEvidence(sb, activeUserId, {
          file: nationalIdFile,
          reportFolder: "national-id",
        });
        if (!up.ok) {
          setPending(false);
          setRegisterPhase("idle");
          setError(
            `Account created but ID upload failed: ${up.message}. Try again from support.`,
          );
          return;
        }
        storagePaths.push(up.path);
      }
      if (accountType === "company") {
        for (const file of companyRegistryFiles) {
          const up = await uploadFraudEvidence(sb, activeUserId, {
            file,
            reportFolder: "commercial-registry",
          });
          if (!up.ok) {
            setPending(false);
            setRegisterPhase("idle");
            setError(
              `Account created but document upload failed: ${up.message}.`,
            );
            return;
          }
          storagePaths.push(up.path);
        }
      }
      setRegisterPhase("profile");
      const upsertResult =
        accountType === "individual"
          ? await upsertRegistrationProfile(sb, {
              userId: activeUserId,
              userEmail: signedUpEmail,
              accountType: "individual",
              phone: phone.trim(),
              fullLegalName: fullLegalName.trim(),
              shippingLine1: shippingLine1.trim(),
              shippingLine2: shippingLine2.trim(),
              shippingCity: shippingCity.trim(),
              shippingRegion: shippingRegion.trim(),
              shippingPostalCode: shippingPostalCode.trim(),
              shippingCountry: shippingCountry.trim(),
              nationalIdStoragePaths: storagePaths,
            })
          : await upsertRegistrationProfile(sb, {
              userId: activeUserId,
              userEmail: signedUpEmail,
              accountType: "company",
              commercialRegistry: crNumber.trim(),
              companyEmail: companyEmail.trim(),
              companyLegalName: companyLegalName.trim(),
              companyAddressLine1: companyAddressLine1.trim(),
              companyAddressLine2: companyAddressLine2.trim(),
              companyCity: companyCity.trim(),
              companyRegion: companyRegion.trim(),
              companyPostalCode: companyPostalCode.trim(),
              companyCountry: companyCountry.trim(),
              companyLocationNote: companyLocationNote.trim(),
              nationalIdStoragePaths: storagePaths,
            });
      if (!upsertResult.ok) {
        setPending(false);
        setRegisterPhase("idle");
        setError(`Could not save registration data: ${upsertResult.message}`);
        return;
      }
    } else if (sb && !signUpResult.hasSession) {
      const fileList: File[] =
        accountType === "individual"
          ? nationalIdFile
            ? [nationalIdFile]
            : []
          : companyRegistryFiles;
      const encoded = await filesToPendingPayload(fileList);
      if (!encoded.ok) {
        setPending(false);
        setRegisterPhase("idle");
        setError(encoded.message);
        return;
      }
      const pendingForm: PendingProfileFormV1 = {
        version: 1,
        userId,
        userEmail: signedUpEmail,
        accountType,
        phone: phone.trim(),
        fullLegalName: fullLegalName.trim(),
        shippingLine1: shippingLine1.trim(),
        shippingLine2: shippingLine2.trim(),
        shippingCity: shippingCity.trim(),
        shippingRegion: shippingRegion.trim(),
        shippingPostalCode: shippingPostalCode.trim(),
        shippingCountry: shippingCountry.trim(),
        companyLegalName: companyLegalName.trim(),
        crNumber: crNumber.trim(),
        companyEmail: companyEmail.trim(),
        companyAddressLine1: companyAddressLine1.trim(),
        companyAddressLine2: companyAddressLine2.trim(),
        companyCity: companyCity.trim(),
        companyRegion: companyRegion.trim(),
        companyPostalCode: companyPostalCode.trim(),
        companyCountry: companyCountry.trim(),
        companyLocationNote: companyLocationNote.trim(),
      };
      writePendingProfilePayload({
        version: 1,
        form: pendingForm,
        files: encoded.list,
      });
      setRegisterPhase("idle");
      setPending(false);
      setStep("awaitEmail");
      return;
    }
    setRegisterPhase("idle");
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
    if (!individualIdentityConfirmed) {
      setError(
        "Confirm that your phone number and identity details are correct before completing verification.",
      );
      return;
    }
    setPending(true);
    const verified: boolean = await completeVerification({
      accountType: "individual",
      phone,
    });
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
    const verified: boolean = await completeVerification({
      accountType: "company",
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
    if (!isHydrated || !hasSupabase) {
      return;
    }
    if (searchParams.get("finish") !== "1") {
      return;
    }
    if (resumeAttemptedRef.current) {
      return;
    }
    const sb = createSupabaseBrowserClient();
    if (!sb) {
      return;
    }
    let cancelled = false;
    void (async (): Promise<void> => {
      const { data } = await sb.auth.getUser();
      const uid: string | undefined = data.user?.id;
      if (!uid) {
        void router.replace("/register");
        return;
      }
      const pending = readPendingProfilePayload();
      if (!pending || pending.form.userId !== uid) {
        void router.replace("/register");
        return;
      }
      resumeAttemptedRef.current = true;
      setRegisterPhase("upload");
      setError("");
      const paths: string[] = [];
      const files = pending.files.map(pendingFileToFile);
      const f0 = pending.form;
      const googleDisplayName: string | null = data.user
        ? resolveGoogleDisplayName(data.user)
        : null;
      if (f0.accountType === "individual" && files.length > 0) {
        const gate = await requestNationalIdOcrGate({
          file: files[0],
          expectedLegalName: f0.fullLegalName.trim(),
          googleDisplayName,
        });
        if (!gate.ok) {
          if (!cancelled) {
            setError(gate.message);
            setRegisterPhase("idle");
            resumeAttemptedRef.current = false;
          }
          return;
        }
      }
      if (f0.accountType === "company" && files.length > 0) {
        const gate = await requestNationalIdOcrGate({
          file: files[0],
          expectedLegalName: f0.companyLegalName.trim(),
          googleDisplayName,
        });
        if (!gate.ok) {
          if (!cancelled) {
            setError(gate.message);
            setRegisterPhase("idle");
            resumeAttemptedRef.current = false;
          }
          return;
        }
      }
      const folder: string =
        pending.form.accountType === "company"
          ? "commercial-registry"
          : "national-id";
      for (const file of files) {
        if (cancelled) {
          return;
        }
        const up = await uploadFraudEvidence(sb, uid, {
          file,
          reportFolder: folder,
        });
        if (!up.ok) {
          if (!cancelled) {
            setError(up.message);
            setRegisterPhase("idle");
            resumeAttemptedRef.current = false;
          }
          return;
        }
        paths.push(up.path);
      }
      if (cancelled) {
        return;
      }
      setRegisterPhase("profile");
      const f = pending.form;
      const upsertResult =
        f.accountType === "individual"
          ? await upsertRegistrationProfile(sb, {
              userId: uid,
              userEmail: f.userEmail.trim(),
              accountType: "individual",
              phone: f.phone.trim(),
              fullLegalName: f.fullLegalName.trim(),
              shippingLine1: f.shippingLine1.trim(),
              shippingLine2: f.shippingLine2.trim(),
              shippingCity: f.shippingCity.trim(),
              shippingRegion: f.shippingRegion.trim(),
              shippingPostalCode: f.shippingPostalCode.trim(),
              shippingCountry: f.shippingCountry.trim(),
              nationalIdStoragePaths: paths,
            })
          : await upsertRegistrationProfile(sb, {
              userId: uid,
              userEmail: f.userEmail.trim(),
              accountType: "company",
              commercialRegistry: f.crNumber.trim(),
              companyEmail: f.companyEmail.trim(),
              companyLegalName: f.companyLegalName.trim(),
              companyAddressLine1: f.companyAddressLine1.trim(),
              companyAddressLine2: f.companyAddressLine2.trim(),
              companyCity: f.companyCity.trim(),
              companyRegion: f.companyRegion.trim(),
              companyPostalCode: f.companyPostalCode.trim(),
              companyCountry: f.companyCountry.trim(),
              companyLocationNote: f.companyLocationNote.trim(),
              nationalIdStoragePaths: paths,
            });
      if (cancelled) {
        return;
      }
      if (!upsertResult.ok) {
        setError(upsertResult.message);
        setRegisterPhase("idle");
        resumeAttemptedRef.current = false;
        return;
      }
      clearPendingProfilePayload();
      setPhone(f.phone.trim());
      setFullLegalName(f.fullLegalName.trim());
      setShippingLine1(f.shippingLine1.trim());
      setShippingLine2(f.shippingLine2.trim());
      setShippingCity(f.shippingCity.trim());
      setShippingRegion(f.shippingRegion.trim());
      setShippingPostalCode(f.shippingPostalCode.trim());
      setShippingCountry(f.shippingCountry.trim());
      setCompanyLegalName(f.companyLegalName.trim());
      setCrNumber(f.crNumber.trim());
      setCompanyEmail(f.companyEmail.trim());
      setCompanyAddressLine1(f.companyAddressLine1.trim());
      setCompanyAddressLine2(f.companyAddressLine2.trim());
      setCompanyCity(f.companyCity.trim());
      setCompanyRegion(f.companyRegion.trim());
      setCompanyPostalCode(f.companyPostalCode.trim());
      setCompanyCountry(f.companyCountry.trim());
      setCompanyLocationNote(f.companyLocationNote.trim());
      setAccountType(f.accountType);
      setEmail(f.userEmail.trim());
      setRegisterPhase("idle");
      setStep("verify");
      void router.replace("/register");
    })();
    return () => {
      cancelled = true;
    };
  }, [isHydrated, hasSupabase, searchParams, router]);

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
        {oauthUrlError || googleOAuthError ? (
          <p
            className="mt-3 rounded-lg border border-red-900/50 bg-red-950/25 px-3 py-2 text-sm text-red-300"
            role="alert"
          >
            {oauthUrlError || googleOAuthError}
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
        ) : step === "awaitEmail" ? (
          <section className="mt-8 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Confirm your email
            </h2>
            <p className="text-sm text-slate-300">
              Your account was created. Open the confirmation link we sent to{" "}
              <span className="font-medium text-slate-100">{email}</span>. After
              you confirm, you will be brought back here to upload files to
              storage and save your profile automatically.
            </p>
            <p className="text-xs text-slate-500">
              If you already confirmed, wait a moment or refresh this page. You
              can also open the link from your inbox again.
            </p>
            {registerPhase !== "idle" ? (
              <p className="text-xs text-slate-400" aria-live="polite">
                {registerPhase === "upload"
                  ? "Uploading documents…"
                  : registerPhase === "profile"
                    ? "Saving profile…"
                    : "Working…"}
              </p>
            ) : null}
            {error ? (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            ) : null}
          </section>
        ) : step === "account" ? (
          <form
            onSubmit={handleAccountSubmit}
            className="mt-8 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Account
            </h2>
            {hasSupabase ? (
              <div className="space-y-3">
                <p className="text-xs leading-relaxed text-slate-500">
                  {googleCopy.googleHint}
                </p>
                <GoogleSignInButton
                  label={googleCopy.google}
                  pendingLabel={googleCopy.googlePending}
                  disabled={pending}
                  onPress={async () => {
                    setGoogleOAuthError("");
                    setError("");
                    const result = await signInWithGoogle();
                    if (!result.ok) {
                      setGoogleOAuthError(result.message || googleCopy.googleFail);
                    }
                  }}
                />
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center" aria-hidden>
                    <div className="w-full border-t border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase tracking-wide">
                    <span className="bg-slate-900/90 px-3 text-slate-500">
                      {googleCopy.divider}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
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
                    Phone
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
            {pending && registerPhase !== "idle" ? (
              <p className="text-xs text-slate-500" aria-live="polite">
                {registerPhase === "auth"
                  ? "Creating your account (auth)…"
                  : registerPhase === "upload"
                    ? "Uploading documents…"
                    : "Saving your profile to the database…"}
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
                {pending
                  ? registerPhase === "auth"
                    ? "Creating account…"
                    : registerPhase === "upload"
                      ? "Uploading…"
                      : registerPhase === "profile"
                        ? "Saving profile…"
                        : "Working…"
                  : "Create & verify"}
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
              Your ID and shipping details were saved when you created the account.
              Phone on file:{" "}
              <span className="font-medium text-slate-300">{phone}</span>. Confirm
              below to mark your profile as verified in the registry.
            </p>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={individualIdentityConfirmed}
                onChange={(e) => setIndividualIdentityConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border border-slate-600 bg-slate-900 text-red-600"
              />
              <span>
                I confirm the phone number and identity information I provided are
                accurate. I understand false information may result in account
                closure and legal consequences.
              </span>
            </label>
            {error ? (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={pending || !individualIdentityConfirmed}
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
                verification using the confirmation link sent to that address.
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
