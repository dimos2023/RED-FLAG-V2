"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { uploadUserAvatar, isValidAvatarFile } from "@/lib/supabase/storage";
import { useAuth } from "@/contexts/auth-context";
import { SiteHeader } from "@/components/site-header";
type ProfileRow = {
  email: string | null;
  full_name: string | null;
  phone: string | null;
  national_id_number: string | null;
  shipping_country: string | null;
  avatar_url: string | null;
};

type SearchHistoryRow = {
  id: string;
  query: string;
  created_at: string;
};

type ProfileReportRow = {
  id: string;
  subject_name: string | null;
  review_status: "pending" | "approved" | "rejected";
  created_at: string;
};

type StatusMessage = {
  message: string;
  variant: "success" | "error";
};

function formatDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProfilePage() {
  const { user, isHydrated, updateProfile } = useAuth();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [reports, setReports] = useState<ProfileReportRow[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryRow[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalIdNumber, setNationalIdNumber] = useState("");
  const [country, setCountry] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [avatarFile]);

  useEffect(() => {
    if (!supabase || !user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const load = async (): Promise<void> => {
      const [{ data: profileRow, error: profileError }, { data: reportRows, error: reportError }, { data: historyRows, error: historyError }] =
        await Promise.all([
          supabase
            .schema("public")
            .from("profiles")
            .select("email, full_name, phone, national_id_number, shipping_country, avatar_url")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .schema("public")
            .from("reports")
            .select("id, subject_name, review_status, created_at")
            .eq("owner_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .schema("public")
            .from("search_logs")
            .select("id, query, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

      if (profileError) {
        setStatus({ message: profileError.message, variant: "error" });
      } else if (profileRow) {
        setProfile(profileRow);
        setFullName(profileRow.full_name ?? user.fullName ?? "");
        setPhone(profileRow.phone ?? "");
        setNationalIdNumber(profileRow.national_id_number ?? "");
        setCountry(profileRow.shipping_country ?? "");
        setAvatarUrl(profileRow.avatar_url ?? null);
      }

      if (reportError) {
        setStatus({ message: reportError.message, variant: "error" });
      } else if (reportRows) {
        setReports(reportRows as ProfileReportRow[]);
      }

      if (historyError) {
        setStatus({ message: historyError.message, variant: "error" });
      } else if (historyRows) {
        setSearchHistory(historyRows as SearchHistoryRow[]);
      }

      setIsLoading(false);
    };

    void load();
  }, [supabase, user]);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file && !isValidAvatarFile(file)) {
      setStatus({ message: "صورة الملف الشخصي يجب أن تكون JPG، PNG، WEBP، GIF ولا تزيد عن 5 ميغابايت.", variant: "error" });
      setAvatarFile(null);
      return;
    }
    setStatus(null);
    setAvatarFile(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !user) {
      return;
    }

    setIsSaving(true);
    setStatus(null);
    let finalAvatarUrl: string | null = avatarUrl;

    if (avatarFile) {
      const result = await uploadUserAvatar(supabase, user.id, avatarFile);
      if (!result.ok) {
        setStatus({ message: result.message, variant: "error" });
        setIsSaving(false);
        return;
      }
      finalAvatarUrl = result.publicUrl;
    }

    const payload = {
      id: user.id,
      email: user.email ?? profile?.email ?? null,
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
      national_id_number: nationalIdNumber.trim() || null,
      shipping_country: country.trim() || null,
      avatar_url: finalAvatarUrl,
    };

    const { error } = await supabase.schema("public").from("profiles").upsert(payload, {
      onConflict: "id",
    });

    if (error) {
      setStatus({ message: error.message, variant: "error" });
      setIsSaving(false);
      return;
    }

    setProfile((prev) => ({
      ...(prev ?? {}),
      ...payload,
    }));
    setAvatarUrl(finalAvatarUrl);
    updateProfile({ fullName: payload.full_name ?? user.fullName, avatarUrl: finalAvatarUrl ?? undefined });
    setAvatarFile(null);
    startTransition(() => {
      setStatus({ message: "Profile updated successfully.", variant: "success" });
    });
    setIsSaving(false);
  };

  if (!isHydrated) {
    return (
      <div className="min-h-dvh bg-transparent">
        <SiteHeader />
        <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-red-500" />
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-dvh bg-transparent">
        <SiteHeader />
        <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center">
            <h1 className="text-2xl font-semibold text-slate-100">Authentication required</h1>
            <p className="mt-3 text-sm text-slate-400">
              You must sign in to view and update your profile settings.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-500"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm text-slate-200 hover:bg-slate-800"
              >
                Create account
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-transparent">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">Profile settings</p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-100">My account</h1>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-3xl border border-slate-700 bg-slate-900">
                  {avatarPreviewUrl || avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarPreviewUrl ?? avatarUrl ?? ""}
                      alt="User avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-slate-800 text-xl font-semibold text-slate-300">
                      {user.email?.charAt(0).toUpperCase() ?? "U"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Email address</span>
                    <input
                      disabled
                      value={user.email ?? profile?.email ?? ""}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-slate-200 outline-none ring-1 ring-slate-800"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Country</span>
                    <input
                      value={country}
                      onChange={(event) => setCountry(event.target.value)}
                      placeholder="e.g. Egypt"
                      className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-slate-200 outline-none ring-1 ring-slate-800"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Full name</span>
                    <input
                      required
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Your full name"
                      className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-slate-200 outline-none ring-1 ring-slate-800"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Phone number</span>
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="+20 1234 567890"
                      className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-slate-200 outline-none ring-1 ring-slate-800"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-300 sm:col-span-2">
                    <span>National ID number</span>
                    <input
                      value={nationalIdNumber}
                      onChange={(event) => setNationalIdNumber(event.target.value)}
                      placeholder="Enter national ID"
                      className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-slate-200 outline-none ring-1 ring-slate-800"
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2 text-sm text-slate-300">
                    <p>Upload avatar</p>
                    <p className="text-xs text-slate-500">
                      JPG, PNG, WEBP, GIF only. Max 5MB.
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="w-full text-sm text-slate-200 file:rounded-xl file:border file:border-slate-700 file:bg-slate-900 file:px-4 file:py-2 file:text-slate-100"
                  />
                </div>

                {status ? (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      status.variant === "success"
                        ? "bg-emerald-950/80 text-emerald-300 border border-emerald-700/40"
                        : "bg-rose-950/80 text-rose-300 border border-rose-700/40"
                    }`}
                  >
                    {status.message}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="submit"
                    disabled={isSaving || isPending}
                    className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving || isPending ? "Saving..." : "Save changes"}
                  </button>
                  <p className="text-xs text-slate-500">
                    Changes are saved to your user profile and will appear in the account activity log.
                  </p>
                </div>
              </form>
            </div>
          </section>

          <section className="space-y-8">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/10">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">My fraud reports</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-100">Recent submissions</h2>
                </div>
              </div>
              {isLoading ? (
                <div className="space-y-3">
                  <div className="h-16 rounded-3xl bg-slate-900/60" />
                  <div className="h-16 rounded-3xl bg-slate-900/60" />
                </div>
              ) : reports.length === 0 ? (
                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-slate-400">
                  No reports found yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <article
                      key={report.id}
                      className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-100">{report.subject_name ?? "Unnamed report"}</p>
                          <p className="text-sm text-slate-500">{formatDateTime(report.created_at)}</p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            report.review_status === "approved"
                              ? "bg-emerald-500/10 text-emerald-200"
                              : report.review_status === "rejected"
                              ? "bg-rose-500/10 text-rose-200"
                              : "bg-amber-500/10 text-amber-200"
                          }`}
                        >
                          {report.review_status}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/10">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Search history</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-100">Recent queries</h2>
                </div>
              </div>
              {isLoading ? (
                <div className="space-y-3">
                  <div className="h-16 rounded-3xl bg-slate-900/60" />
                  <div className="h-16 rounded-3xl bg-slate-900/60" />
                </div>
              ) : searchHistory.length === 0 ? (
                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-slate-400">
                  No search history found yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {searchHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4"
                    >
                      <p className="font-medium text-slate-100">{entry.query}</p>
                      <p className="mt-1 text-sm text-slate-500">{formatDateTime(entry.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
