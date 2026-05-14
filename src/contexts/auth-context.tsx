"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { setSupabasePublicEnvOverride } from "@/lib/supabase/env";
import {
  hasGoogleIdentity,
  upsertProfileFromGoogleUser,
} from "@/lib/supabase/google_profile_sync";
import { markProfileVerified } from "@/lib/supabase/profile_registration";
import {
  PROFILE_HYDRATE_SELECT_FALLBACK,
  PROFILE_HYDRATE_SELECT_PRIMARY,
} from "@/lib/supabase/profile_columns";
import type { AccountType, UserProfile } from "@/types";
import { TERMS_VERSION } from "@/lib/terms_of_service";

const STORAGE_KEY = "red-flag-profile-v1";

export type SignInResult =
  | { ok: true }
  | { ok: false; message: string };

export type SignUpResult =
  | { ok: true; userId: string; userEmail: string; hasSession: boolean }
  | { ok: false; message: string };

type AuthContextValue = {
  user: UserProfile | null;
  supabaseUser: User | null;
  isAdmin: boolean;
  /** Supabase-only: becomes true after `/app_admins` lookup completes for the signed-in user */
  isAdminRoleResolved: boolean;
  isHydrated: boolean;
  /** True when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set (from env / Vercel). */
  hasSupabase: boolean;
  signInWithPassword: (email: string, password: string) => Promise<SignInResult>;
  signInWithGoogle: (options?: { nextPath?: string }) => Promise<SignInResult>;
  signUp: (params: {
    email: string;
    password: string;
    accountType: AccountType;
    hasAcceptedTerms: boolean;
    registration?: Partial<UserProfile>;
  }) => Promise<SignUpResult>;
  completeVerification: (params: {
    accountType: AccountType;
    phone?: string;
    commercialRegistry?: string;
    companyEmail?: string;
  }) => Promise<boolean>;
  signOut: () => void;
  updateProfile: (partial: Partial<UserProfile>) => void;
  refreshSessionFromSupabase: () => Promise<void>;
};

type ProfileRow = {
  email: string | null;
  is_verified: boolean | null;
  verification_status?: string | null;
  full_name: string | null;
  updated_at: string | null;
  full_legal_name: string | null;
  phone: string | null;
  shipping_line1: string | null;
  shipping_line2: string | null;
  shipping_city: string | null;
  shipping_region: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  company_legal_name: string | null;
  company_address_line1: string | null;
  company_address_line2: string | null;
  company_city: string | null;
  company_region: string | null;
  company_postal_code: string | null;
  company_country: string | null;
  company_location_note: string | null;
  national_id_storage_path: string[] | string | null;
  national_id_number?: string | null;
};

function parsePrefixedLine(
  text: string | null | undefined,
  label: string,
): string | undefined {
  if (!text) {
    return undefined;
  }
  const escaped: string = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re: RegExp = new RegExp(`^${escaped}\\s*(.+)$`, "m");
  const m: RegExpExecArray | null = re.exec(text);
  return m?.[1]?.trim();
}

function stripCompanyRegistrationPrefixes(
  note: string | null,
): string | undefined {
  if (!note) {
    return undefined;
  }
  const without: string = note
    .replace(/^CR:\s*.+$/m, "")
    .replace(/^Official company email:\s*.+$/m, "")
    .replace(/^\n+/, "")
    .trim();
  return without.length > 0 ? without : undefined;
}

function pathsFromNationalIdField(
  raw: string | null,
): { single?: string; list?: string[] } {
  if (!raw || raw.trim() === "") {
    return {};
  }
  if (raw.includes("|")) {
    const list: string[] = raw
      .split("|")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
    return { list };
  }
  return { single: raw.trim() };
}

function normalizeNationalPaths(
  value: string | string[] | null | undefined,
): string[] {
  if (value == null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter(
      (p: unknown): p is string => typeof p === "string" && p.trim().length > 0,
    );
  }
  if (typeof value === "string") {
    return pathsFromNationalIdField(value).list ??
      (value.trim() ? [value.trim()] : []);
  }
  return [];
}

function resolveVerificationStatus(row: ProfileRow): "pending" | "verified" | "rejected" {
  const raw: string | undefined = row.verification_status?.trim().toLowerCase();
  if (raw === "verified" || raw === "pending" || raw === "rejected") {
    return raw;
  }
  if (row.is_verified === true) {
    return "verified";
  }
  return "pending";
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredProfile(): UserProfile | null {
  if (typeof window === "undefined") {
    return null;
  }
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

function buildProfileFromAuthUser(u: User): UserProfile {
  const meta: Record<string, unknown> | undefined =
    u.user_metadata as Record<string, unknown> | undefined;
  const accountType: AccountType =
    meta?.account_type === "company" ? "company" : "individual";
  return {
    id: u.id,
    email: u.email ?? "",
    accountType,
    hasAcceptedTerms: Boolean(meta?.terms_version === TERMS_VERSION),
    isVerified: Boolean(meta?.is_verified),
    phone: typeof meta?.phone === "string" ? meta.phone : undefined,
    commercialRegistry:
      typeof meta?.commercial_registry === "string"
        ? meta.commercial_registry
        : undefined,
    companyEmail:
      typeof meta?.company_email === "string" ? meta.company_email : undefined,
  };
}

function writeStoredProfile(profile: UserProfile | null): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (!profile) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore quota / blocked storage */
  }
}

export function AuthProvider({
  children,
  supabasePublic,
}: {
  children: ReactNode;
  supabasePublic: { url: string; anonKey: string } | null;
}) {
  if (typeof window !== "undefined") {
    setSupabasePublicEnvOverride(supabasePublic);
  }
  const [user, setUser] = useState<UserProfile | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isAdminRoleResolved, setIsAdminRoleResolved] =
    useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [profileRefreshNonce, setProfileRefreshNonce] = useState<number>(0);
  const googleProfileSyncedForUserIdRef = useRef<string | null>(null);
  const supabaseUserRef = useRef<User | null>(null);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const hasSupabase: boolean = supabase !== null;
  supabaseUserRef.current = supabaseUser;

  useEffect(() => {
    setUser(readStoredProfile());
    setIsHydrated(true);
  }, []);

  const applyAuthSession = useCallback((session: Session | null): void => {
    try {
      const u: User | null = session?.user ?? null;
      setSupabaseUser(u);
      if (!u) {
        setUser(null);
        writeStoredProfile(null);
        return;
      }
      const profile: UserProfile = buildProfileFromAuthUser(u);
      setUser(profile);
      writeStoredProfile(profile);
    } catch {
      setSupabaseUser(null);
      setUser(null);
      writeStoredProfile(null);
    }
  }, []);

  const syncSessionFromSupabase = useCallback(async (): Promise<void> => {
    if (!supabase) {
      return;
    }
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      applyAuthSession(null);
      return;
    }
    applyAuthSession(data.session);
  }, [supabase, applyAuthSession]);

  useEffect(() => {
    if (!supabase) {
      return;
    }
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      applyAuthSession(session);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, [supabase, applyAuthSession]);

  useEffect(() => {
    if (!supabase) {
      return;
    }
    void syncSessionFromSupabase();
  }, [supabase, syncSessionFromSupabase]);

  useEffect(() => {
    if (!supabase) {
      setIsAdmin(false);
      setIsAdminRoleResolved(true);
      return;
    }
    const userId: string | undefined = supabaseUser?.id;
    if (!userId) {
      setIsAdmin(false);
      setIsAdminRoleResolved(true);
      return;
    }
    setIsAdmin(false);
    setIsAdminRoleResolved(false);
    let cancelled: boolean = false;
    void (async (): Promise<void> => {
      try {
        const { data, error } = await supabase
          .schema("public")
          .from("app_admins")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle();
        if (cancelled) {
          return;
        }
        if (error) {
          console.warn(
            "[auth] app_admins single-shot select failed; treating user as non-admin",
            error.message,
          );
          setIsAdmin(false);
          setIsAdminRoleResolved(true);
          return;
        }
        setIsAdmin(data !== null);
        setIsAdminRoleResolved(true);
      } catch (err: unknown) {
        if (cancelled) {
          return;
        }
        const msg: string = err instanceof Error ? err.message : String(err);
        console.warn(
          "[auth] app_admins select threw; treating user as non-admin",
          msg,
        );
        setIsAdmin(false);
        setIsAdminRoleResolved(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, supabaseUser?.id]);

  // Profile hydrate: depend on user id only — `supabaseUser` reference changes on token refresh and would re-fetch in a loop.
  useEffect(() => {
    if (!supabase || !supabaseUser?.id) {
      return;
    }
    const hydrateUserId: string = supabaseUser.id;
    let cancelled: boolean = false;
    void (async (): Promise<void> => {
      try {
        let res = await supabase
          .schema("public")
          .from("profiles")
          .select(PROFILE_HYDRATE_SELECT_PRIMARY)
          .eq("id", hydrateUserId)
          .maybeSingle();
        if (res.error) {
          console.warn(
            "[auth] profiles primary select failed, retrying fallback",
            res.error.message,
          );
          res = await supabase
            .schema("public")
            .from("profiles")
            .select(PROFILE_HYDRATE_SELECT_FALLBACK)
            .eq("id", hydrateUserId)
            .maybeSingle();
        }
        if (cancelled || res.error || res.data === null) {
          if (res.error) {
            console.warn("[auth] profiles select failed", res.error.message);
          }
          return;
        }
        const row: ProfileRow = res.data as unknown as ProfileRow;
        const authSnapshot: User = supabaseUserRef.current ?? supabaseUser;
        setUser((prev) => {
          const fallback: UserProfile =
            prev ?? buildProfileFromAuthUser(authSnapshot);
          const note: string | null = row.company_location_note;
          const crParsed: string | undefined = parsePrefixedLine(note, "CR:");
          const emailParsed: string | undefined = parsePrefixedLine(
            note,
            "Official company email:",
          );
          const normPaths: string[] = normalizeNationalPaths(
            row.national_id_storage_path,
          );
          const isCompanyRow: boolean = Boolean(row.company_legal_name?.trim());
          const next: UserProfile = {
            ...fallback,
            isVerified: resolveVerificationStatus(row) === "verified",
            verificationStatus: resolveVerificationStatus(row),
            email: row.email?.trim() || fallback.email,
            fullName: row.full_name ?? fallback.fullName,
            fullLegalName: row.full_legal_name ?? fallback.fullLegalName,
            phone: row.phone?.trim() || fallback.phone,
            shippingLine1: row.shipping_line1 ?? fallback.shippingLine1,
            shippingLine2: row.shipping_line2 ?? fallback.shippingLine2,
            shippingCity: row.shipping_city ?? fallback.shippingCity,
            shippingRegion: row.shipping_region ?? fallback.shippingRegion,
            shippingPostalCode:
              row.shipping_postal_code ?? fallback.shippingPostalCode,
            shippingCountry: row.shipping_country ?? fallback.shippingCountry,
            companyLegalName:
              row.company_legal_name ?? fallback.companyLegalName,
            companyAddressLine1:
              row.company_address_line1 ?? fallback.companyAddressLine1,
            companyAddressLine2:
              row.company_address_line2 ?? fallback.companyAddressLine2,
            companyCity: row.company_city ?? fallback.companyCity,
            companyRegion: row.company_region ?? fallback.companyRegion,
            companyPostalCode:
              row.company_postal_code ?? fallback.companyPostalCode,
            companyCountry: row.company_country ?? fallback.companyCountry,
            companyLocationNote:
              stripCompanyRegistrationPrefixes(note) ??
              fallback.companyLocationNote,
            commercialRegistry: crParsed ?? fallback.commercialRegistry,
            companyEmail: emailParsed ?? fallback.companyEmail,
            nationalIdStoragePaths:
              normPaths.length > 0 ? normPaths : fallback.nationalIdStoragePaths,
            nationalIdStoragePath:
              normPaths[0] ?? fallback.nationalIdStoragePath,
            commercialRegistryStoragePaths: isCompanyRow
              ? normPaths.length > 0
                ? normPaths
                : fallback.commercialRegistryStoragePaths
              : fallback.commercialRegistryStoragePaths,
            nationalIdNumber:
              row.national_id_number?.trim() ||
              fallback.nationalIdNumber,
          };
          writeStoredProfile(next);
          return next;
        });
      } catch (err: unknown) {
        const msg: string = err instanceof Error ? err.message : String(err);
        console.warn("[auth] profiles hydrate threw", msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable identity is supabaseUser.id; full object changes on token refresh without id change
  }, [supabase, supabaseUser?.id, profileRefreshNonce]);

  useEffect(() => {
    const uid: string | undefined = supabaseUser?.id;
    if (!supabase || !uid) {
      return;
    }
    const googleUser: User | null = supabaseUserRef.current;
    if (!googleUser || googleUser.id !== uid) {
      return;
    }
    if (!hasGoogleIdentity(googleUser)) {
      return;
    }
    if (googleProfileSyncedForUserIdRef.current === googleUser.id) {
      return;
    }
    googleProfileSyncedForUserIdRef.current = googleUser.id;
    let cancelled: boolean = false;
    void upsertProfileFromGoogleUser(supabase, googleUser).then((result) => {
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        googleProfileSyncedForUserIdRef.current = null;
        return;
      }
      setProfileRefreshNonce((n: number) => n + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, supabaseUser?.id]);

  const signInWithGoogle = useCallback(
    async (options?: { nextPath?: string }): Promise<SignInResult> => {
      if (!supabase) {
        return {
          ok: false,
          message:
            "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local or your deployment environment (e.g. Vercel), then redeploy or restart the dev server.",
        };
      }
      const origin: string =
        typeof window !== "undefined" ? window.location.origin : "";
      if (!origin) {
        return { ok: false, message: "Could not resolve app origin for OAuth." };
      }
      const nextPath: string =
        options?.nextPath?.trim() !== undefined &&
        options.nextPath.trim().length > 0
          ? options.nextPath.trim()
          : "/auth/post-oauth";
      const redirectTo: string = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) {
        return { ok: false, message: error.message };
      }
      if (data.url) {
        window.location.assign(data.url);
        return { ok: true };
      }
      return { ok: false, message: "OAuth URL was not returned by Supabase." };
    },
    [supabase],
  );

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      const normalizedEmail: string = email.trim();
      if (!supabase) {
        return {
          ok: false,
          message:
            "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (local) or in your host project settings (e.g. Vercel → Environment Variables), then redeploy or restart the dev server.",
        };
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) {
        return { ok: false, message: error.message };
      }
      await syncSessionFromSupabase();
      return { ok: true };
    },
    [supabase, syncSessionFromSupabase],
  );

  const signUp = useCallback(
    async (params: {
      email: string;
      password: string;
      accountType: AccountType;
      hasAcceptedTerms: boolean;
      registration?: Partial<UserProfile>;
    }): Promise<SignUpResult> => {
      if (!params.hasAcceptedTerms) {
        return { ok: false, message: "You must accept the Terms of Service." };
      }
      if (!supabase) {
        return {
          ok: false,
          message:
            "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local or your deployment environment, then redeploy.",
        };
      }
      const origin: string =
        typeof window !== "undefined" ? window.location.origin : "";
      const { data, error } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
          emailRedirectTo: origin
            ? `${origin}/auth/callback?next=${encodeURIComponent("/register?finish=1")}`
            : undefined,
          data: {
            account_type: params.accountType,
            terms_version: TERMS_VERSION,
            is_verified: false,
          },
        },
      });
      if (error) {
        return { ok: false, message: error.message };
      }
      const newUser = data.user;
      if (!newUser?.id) {
        return {
          ok: false,
          message:
            "Signup did not return a user id. If email confirmation is enabled, confirm your email then sign in to finish registration.",
        };
      }
      const hasSession: boolean = Boolean(data.session);
      await syncSessionFromSupabase();
      return {
        ok: true,
        userId: newUser.id,
        userEmail: newUser.email ?? params.email.trim(),
        hasSession,
      };
    },
    [supabase, syncSessionFromSupabase],
  );

  const completeVerification = useCallback(
    async (params: {
      accountType: AccountType;
      phone?: string;
      commercialRegistry?: string;
      companyEmail?: string;
    }): Promise<boolean> => {
      if (!supabase) {
        return false;
      }
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        return false;
      }
      const verified = await markProfileVerified(supabase, data.user.id);
      if (!verified.ok) {
        return false;
      }
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          is_verified: true,
          phone: params.phone,
          commercial_registry: params.commercialRegistry,
          company_email: params.companyEmail,
        },
      });
      if (updateError) {
        return false;
      }
      await syncSessionFromSupabase();
      setProfileRefreshNonce((n: number) => n + 1);
      return true;
    },
    [supabase, syncSessionFromSupabase],
  );

  const signOut = useCallback(() => {
    if (supabase) {
      void supabase.auth.signOut();
    }
    googleProfileSyncedForUserIdRef.current = null;
    setUser(null);
    setSupabaseUser(null);
    setIsAdmin(false);
    setIsAdminRoleResolved(true);
    writeStoredProfile(null);
  }, [supabase]);

  const updateProfile = useCallback((partial: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) {
        return prev;
      }
      const next: UserProfile = { ...prev, ...partial };
      writeStoredProfile(next);
      return next;
    });
  }, []);

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      supabaseUser,
      isAdmin,
      isAdminRoleResolved,
      isHydrated,
      hasSupabase,
      signInWithPassword,
      signInWithGoogle,
      signUp,
      completeVerification,
      signOut,
      updateProfile,
      refreshSessionFromSupabase: syncSessionFromSupabase,
    }),
    [
      user,
      supabaseUser,
      isAdmin,
      isAdminRoleResolved,
      isHydrated,
      hasSupabase,
      signInWithPassword,
      signInWithGoogle,
      signUp,
      completeVerification,
      signOut,
      updateProfile,
      syncSessionFromSupabase,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
