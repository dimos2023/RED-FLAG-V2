"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import {
  isProfileRegistrationComplete,
  isVerificationApproved,
  profileRowFromUserProfile,
} from "@/lib/profile_completeness";
import { requestNationalIdOcrGate } from "@/lib/register/ocr_gate";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { resolveGoogleDisplayName } from "@/lib/supabase/google_profile_sync";
import { upsertRegistrationProfile } from "@/lib/supabase/profile_registration";
import { uploadFraudEvidence } from "@/lib/supabase/storage";

function CompleteRegistrationInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason: string | null = searchParams.get("reason");
  const { user, supabaseUser, isHydrated, refreshSessionFromSupabase, completeVerification } =
    useAuth();
  const { isArabic } = useLanguage();
  const [fullLegalName, setFullLegalName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [shippingLine1, setShippingLine1] = useState<string>("");
  const [shippingLine2, setShippingLine2] = useState<string>("");
  const [shippingCity, setShippingCity] = useState<string>("");
  const [shippingRegion, setShippingRegion] = useState<string>("");
  const [shippingPostalCode, setShippingPostalCode] = useState<string>("");
  const [shippingCountry, setShippingCountry] = useState<string>("");
  const [nationalIdFile, setNationalIdFile] = useState<File | null>(null);
  const [nationalIdNumber, setNationalIdNumber] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [pending, setPending] = useState<boolean>(false);
  const copy = useMemo(() => {
    if (isArabic) {
      return {
        title: "إكمال التسجيل",
        unverifiedTitle: "حسابك قيد المراجعة",
        unverifiedBody:
          "حالة التحقق: قيد الانتظار. لا يمكن استخدام البحث والإبلاغ حتى تصبح الحالة «موثّق».",
        companyTitle: "حساب شركة",
        companyBody:
          "أكمل تسجيل الشركة من صفحة إنشاء الحساب أو تواصل مع الدعم.",
        fieldsTitle: "البيانات المطلوبة",
        fullName: "الاسم الكامل كما في الهوية",
        phone: "رقم الهاتف",
        street: "عنوان الشارع",
        line2: "سطر العنوان 2 (اختياري)",
        city: "المدينة",
        region: "المنطقة (اختياري)",
        postal: "الرمز البريدي (اختياري)",
        country: "الدولة",
        nationalIdNumber: "الرقم القومي (كما على البطاقة)",
        idUpload: "صورة الهوية / البطاقة",
        submit: "حفظ والتحقق",
        loading: "جاري المعالجة…",
        backDashboard: "العودة للرئيسية",
        rejected: "تم رفض التحقق من حسابك. راجع البيانات أو تواصل مع الدعم.",
      };
    }
    return {
      title: "Complete registration",
      unverifiedTitle: "Account under review",
      unverifiedBody:
        "Verification status is pending. Search and reporting stay locked until you are verified.",
      companyTitle: "Company account",
      companyBody:
        "Finish company onboarding from the register page or contact support.",
      fieldsTitle: "Required details",
      fullName: "Full legal name (as on ID)",
      phone: "Phone number",
      street: "Street address",
      line2: "Address line 2 (optional)",
      city: "City",
      region: "Region (optional)",
      postal: "Postal code (optional)",
      country: "Country",
      nationalIdNumber: "National ID number (as on card)",
      idUpload: "National ID / government ID image",
      submit: "Save and verify",
      loading: "Processing…",
      backDashboard: "Back to home",
      rejected:
        "Your verification was rejected. Update your details or contact support.",
    };
  }, [isArabic]);
  useEffect(() => {
    if (!user) {
      return;
    }
    setFullLegalName(user.fullLegalName ?? user.fullName ?? "");
    setPhone(user.phone ?? "");
    setShippingLine1(user.shippingLine1 ?? "");
    setShippingLine2(user.shippingLine2 ?? "");
    setShippingCity(user.shippingCity ?? "");
    setShippingRegion(user.shippingRegion ?? "");
    setShippingPostalCode(user.shippingPostalCode ?? "");
    setShippingCountry(user.shippingCountry ?? "");
    setNationalIdNumber(user.nationalIdNumber ?? "");
  }, [user]);
  useEffect(() => {
    if (!user) {
      return;
    }
    const row = profileRowFromUserProfile(user);
    if (isProfileRegistrationComplete(row) && isVerificationApproved(row)) {
      void router.replace("/dashboard");
    }
  }, [user, router]);
  if (!isHydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-red-500" />
      </div>
    );
  }
  if (!user || !supabaseUser) {
    return (
      <div className="min-h-dvh bg-transparent">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-slate-400">
            {isArabic ? "يرجى تسجيل الدخول أولاً." : "Please sign in first."}
          </p>
          <Link href="/login" className="mt-4 inline-block text-red-400">
            {isArabic ? "تسجيل الدخول" : "Sign in"}
          </Link>
        </main>
      </div>
    );
  }
  if (user.accountType === "company") {
    return (
      <div className="min-h-dvh bg-transparent">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-4 py-16">
          <h1 className="text-xl font-semibold text-slate-100">
            {copy.companyTitle}
          </h1>
          <p className="mt-2 text-sm text-slate-400">{copy.companyBody}</p>
          <Link
            href="/register"
            className="mt-8 inline-block rounded-lg bg-red-600 px-4 py-2 text-sm text-white"
          >
            Register
          </Link>
        </main>
      </div>
    );
  }
  const accessRow = profileRowFromUserProfile(user);
  const complete: boolean = isProfileRegistrationComplete(accessRow);
  const approved: boolean = isVerificationApproved(accessRow);
  const vStatus: string | null | undefined =
    accessRow?.verification_status ?? user.verificationStatus ?? null;
  if (complete && !approved && vStatus === "rejected") {
    return (
      <div className="min-h-dvh bg-transparent">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-red-300">{copy.rejected}</p>
        </main>
      </div>
    );
  }
  if (complete && !approved) {
    return (
      <div className="min-h-dvh bg-transparent">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-xl font-semibold text-amber-200">
            {copy.unverifiedTitle}
          </h1>
          <p className="mt-3 text-sm text-slate-400">{copy.unverifiedBody}</p>
          <Link
            href="/"
            className="mt-8 inline-block rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200"
          >
            {copy.backDashboard}
          </Link>
        </main>
      </div>
    );
  }
  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!user || !supabaseUser) {
      return;
    }
    const authUser = supabaseUser;
    const profileUser = user;
    setError("");
    if (!fullLegalName.trim()) {
      setError(isArabic ? "أدخل الاسم الكامل." : "Enter full legal name.");
      return;
    }
    if (!phone.trim()) {
      setError(isArabic ? "أدخل رقم الهاتف." : "Enter phone number.");
      return;
    }
    if (!shippingLine1.trim() || !shippingCity.trim() || !shippingCountry.trim()) {
      setError(
        isArabic
          ? "أدخل عنوان الشارع والمدينة والدولة."
          : "Enter street, city, and country.",
      );
      return;
    }
    if (!nationalIdFile) {
      setError(
        isArabic
          ? "ارفع صورة الهوية."
          : "Upload a photo of your national / government ID.",
      );
      return;
    }
    const nidDigits: string = nationalIdNumber.replace(/\D/g, "");
    if (nidDigits.length < 8) {
      setError(
        isArabic
          ? "أدخل الرقم القومي كاملاً (8 أرقام على الأقل)."
          : "Enter your national ID number (at least 8 digits) as on the card.",
      );
      return;
    }
    const sb = createSupabaseBrowserClient();
    if (!sb) {
      setError("Supabase is not configured.");
      return;
    }
    setPending(true);
    const googleDisplayName: string | null =
      resolveGoogleDisplayName(authUser);
    const gate = await requestNationalIdOcrGate({
      file: nationalIdFile,
      expectedLegalName: fullLegalName.trim(),
      googleDisplayName,
      expectedNationalId: nationalIdNumber,
    });
    if (!gate.ok) {
      setPending(false);
      setError(gate.message);
      return;
    }
    const up = await uploadFraudEvidence(sb, authUser.id, {
      file: nationalIdFile,
      reportFolder: "national-id",
    });
    if (!up.ok) {
      setPending(false);
      setError(up.message);
      return;
    }
    const upsert = await upsertRegistrationProfile(sb, {
      userId: authUser.id,
      userEmail: profileUser.email.trim(),
      accountType: "individual",
      phone: phone.trim(),
      fullLegalName: fullLegalName.trim(),
      shippingLine1: shippingLine1.trim(),
      shippingLine2: shippingLine2.trim(),
      shippingCity: shippingCity.trim(),
      shippingRegion: shippingRegion.trim(),
      shippingPostalCode: shippingPostalCode.trim(),
      shippingCountry: shippingCountry.trim(),
      nationalIdNumber: nationalIdNumber.replace(/\D/g, ""),
      nationalIdStoragePaths: [up.path],
    });
    if (!upsert.ok) {
      setPending(false);
      setError(upsert.message);
      return;
    }
    const okVerify: boolean = await completeVerification({
      accountType: "individual",
      phone: phone.trim(),
    });
    if (!okVerify) {
      setPending(false);
      setError(
        isArabic
          ? "تعذر إتمام التحقق. حاول مرة أخرى."
          : "Could not finalize verification. Try again.",
      );
      return;
    }
    await refreshSessionFromSupabase();
    setPending(false);
    void router.replace("/dashboard");
  }
  return (
    <div className="min-h-dvh bg-transparent">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-2xl font-bold text-slate-50">{copy.title}</h1>
        {reason === "incomplete" ? (
          <p className="mt-2 text-sm text-slate-400">
            {isArabic
              ? "أكمل الحقول التالية وارفع صورة الهوية لتفعيل الوصول."
              : "Fill in the fields below and upload your ID to unlock access."}
          </p>
        ) : null}
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="mt-8 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {copy.fieldsTitle}
          </h2>
          <label className="block text-xs text-slate-500">{copy.fullName}</label>
          <input
            value={fullLegalName}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setFullLegalName(e.target.value)
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <label className="block text-xs text-slate-500">{copy.phone}</label>
          <input
            value={phone}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setPhone(e.target.value)
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <label className="block text-xs text-slate-500">{copy.street}</label>
          <input
            value={shippingLine1}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setShippingLine1(e.target.value)
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <label className="block text-xs text-slate-500">{copy.line2}</label>
          <input
            value={shippingLine2}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setShippingLine2(e.target.value)
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <label className="block text-xs text-slate-500">{copy.city}</label>
          <input
            value={shippingCity}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setShippingCity(e.target.value)
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <label className="block text-xs text-slate-500">{copy.region}</label>
          <input
            value={shippingRegion}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setShippingRegion(e.target.value)
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <label className="block text-xs text-slate-500">{copy.postal}</label>
          <input
            value={shippingPostalCode}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setShippingPostalCode(e.target.value)
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <label className="block text-xs text-slate-500">{copy.country}</label>
          <input
            value={shippingCountry}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setShippingCountry(e.target.value)
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <label className="block text-xs text-slate-500">
            {copy.nationalIdNumber}
          </label>
          <input
            value={nationalIdNumber}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setNationalIdNumber(e.target.value)
            }
            inputMode="numeric"
            autoComplete="off"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <label className="block text-xs text-slate-500">{copy.idUpload}</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setNationalIdFile(e.target.files?.[0] ?? null)
            }
            className="w-full text-sm text-slate-400"
          />
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
            {pending ? copy.loading : copy.submit}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function CompleteRegistrationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-red-500" />
        </div>
      }
    >
      <CompleteRegistrationInner />
    </Suspense>
  );
}
