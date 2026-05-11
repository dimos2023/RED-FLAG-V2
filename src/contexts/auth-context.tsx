"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { markProfileVerified } from "@/lib/supabase/profile_registration";
import type { AccountType, UserProfile } from "@/types";
import { TERMS_VERSION } from "@/lib/terms_of_service";

const STORAGE_KEY = "red-flag-profile-v1";

export type SignInResult =
  | { ok: true }
  | { ok: false; message: string };

type AuthContextValue = {
  user: UserProfile | null;
  supabaseUser: User | null;
  isAdmin: boolean;
  /** Supabase-only: becomes true after `/app_admins` lookup completes for the signed-in user */
  isAdminRoleResolved: boolean;
  isHydrated: boolean;
  isDemoMode: boolean;
  signInDemo: (email: string, password: string) => Promise<SignInResult>;
  signUpDemo: (params: {
    email: string;
    password: string;
    accountType: AccountType;
    hasAcceptedTerms: boolean;
    registration?: Partial<UserProfile>;
  }) => Promise<boolean>;
  completeVerificationDemo: (params: {
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
  account_type: "individual" | "company" | null;
  terms_version: string | null;
  phone: string | null;
  commercial_registry: string | null;
  company_email: string | null;
  is_verified: boolean | null;
  full_legal_name: string | null;
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
  national_id_storage_path: string | null;
  commercial_registry_storage_paths: string[] | null;
};

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isAdminRoleResolved, setIsAdminRoleResolved] =
    useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const isDemoMode: boolean = supabase === null;

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
    if (isDemoMode || supabase === null) {
      setIsAdmin(false);
      setIsAdminRoleResolved(true);
      return;
    }
    if (!supabaseUser) {
      setIsAdmin(false);
      setIsAdminRoleResolved(true);
      return;
    }
    setIsAdmin(false);
    setIsAdminRoleResolved(false);
    let cancelled: boolean = false;
    void supabase
      .from("app_admins")
      .select("user_id")
      .eq("user_id", supabaseUser.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) {
          return;
        }
        setIsAdmin(!error && data !== null);
        setIsAdminRoleResolved(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isDemoMode, supabase, supabaseUser]);

  useEffect(() => {
    if (isDemoMode || !supabase || !supabaseUser) {
      return;
    }
    let cancelled: boolean = false;
    void supabase
      .from("profiles")
      .select(
        "account_type, terms_version, phone, commercial_registry, company_email, is_verified, full_legal_name, shipping_line1, shipping_line2, shipping_city, shipping_region, shipping_postal_code, shipping_country, company_legal_name, company_address_line1, company_address_line2, company_city, company_region, company_postal_code, company_country, company_location_note, national_id_storage_path, commercial_registry_storage_paths",
      )
      .eq("id", supabaseUser.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error || !data) {
          return;
        }
        const row: ProfileRow = data as ProfileRow;
        setUser((prev) => {
          const fallback: UserProfile =
            prev ?? buildProfileFromAuthUser(supabaseUser);
          const paths: string[] | undefined =
            Array.isArray(row.commercial_registry_storage_paths)
              ? row.commercial_registry_storage_paths
              : undefined;
          const next: UserProfile = {
            ...fallback,
            accountType:
              row.account_type === "company" || row.account_type === "individual"
                ? row.account_type
                : fallback.accountType,
            hasAcceptedTerms: row.terms_version
              ? row.terms_version === TERMS_VERSION
              : fallback.hasAcceptedTerms,
            isVerified:
              typeof row.is_verified === "boolean"
                ? row.is_verified
                : fallback.isVerified,
            phone: row.phone ?? fallback.phone,
            commercialRegistry:
              row.commercial_registry ?? fallback.commercialRegistry,
            companyEmail: row.company_email ?? fallback.companyEmail,
            fullLegalName: row.full_legal_name ?? fallback.fullLegalName,
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
              row.company_location_note ?? fallback.companyLocationNote,
            nationalIdStoragePath:
              row.national_id_storage_path ?? fallback.nationalIdStoragePath,
            commercialRegistryStoragePaths:
              paths ?? fallback.commercialRegistryStoragePaths,
          };
          writeStoredProfile(next);
          return next;
        });
      });
    return () => {
      cancelled = true;
    };
  }, [isDemoMode, supabase, supabaseUser]);

  const signInDemo = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      const normalizedEmail: string = email.trim();
      if (!isDemoMode) {
        if (!supabase) {
          return {
            ok: false,
            message: "Supabase is not configured (missing env keys).",
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
      }
      const stored: UserProfile | null = readStoredProfile();
      if (!stored || stored.email !== normalizedEmail) {
        return {
          ok: false,
          message: "Invalid credentials or account not found.",
        };
      }
      if (password.length < 6) {
        return {
          ok: false,
          message: "Invalid credentials or account not found.",
        };
      }
      setUser(stored);
      return { ok: true };
    },
    [isDemoMode, supabase, syncSessionFromSupabase],
  );

  const signUpDemo = useCallback(
    async (params: {
      email: string;
      password: string;
      accountType: AccountType;
      hasAcceptedTerms: boolean;
      registration?: Partial<UserProfile>;
    }): Promise<boolean> => {
      if (!params.hasAcceptedTerms) {
        return false;
      }
      if (!isDemoMode && supabase) {
        const origin: string =
          typeof window !== "undefined" ? window.location.origin : "";
        const { error } = await supabase.auth.signUp({
          email: params.email,
          password: params.password,
          options: {
            emailRedirectTo: origin
              ? `${origin}/auth/callback?next=${encodeURIComponent("/register")}`
              : undefined,
            data: {
              account_type: params.accountType,
              terms_version: TERMS_VERSION,
              is_verified: false,
            },
          },
        });
        return !error;
      }
      const reg: Partial<UserProfile> = params.registration ?? {};
      const profile: UserProfile = {
        id: `demo-${crypto.randomUUID()}`,
        email: params.email,
        accountType: params.accountType,
        hasAcceptedTerms: true,
        isVerified: false,
        ...reg,
      };
      setUser(profile);
      writeStoredProfile(profile);
      return true;
    },
    [isDemoMode, supabase],
  );

  const completeVerificationDemo = useCallback(
    async (params: {
      accountType: AccountType;
      phone?: string;
      commercialRegistry?: string;
      companyEmail?: string;
    }): Promise<boolean> => {
      if (!isDemoMode && supabase) {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          return false;
        }
        const verified = await markProfileVerified(supabase, data.user.id, {
          phone: params.phone,
          commercialRegistry: params.commercialRegistry,
          companyEmail: params.companyEmail,
          accountType: params.accountType,
        });
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
        return true;
      }
      let ok: boolean = false;
      setUser((prev) => {
        if (!prev) {
          return prev;
        }
        ok = true;
        const next: UserProfile = {
          ...prev,
          isVerified: true,
          phone: params.phone ?? prev.phone,
          commercialRegistry:
            params.commercialRegistry ?? prev.commercialRegistry,
          companyEmail: params.companyEmail ?? prev.companyEmail,
        };
        writeStoredProfile(next);
        return next;
      });
      return ok;
    },
    [isDemoMode, supabase, syncSessionFromSupabase],
  );

  const signOut = useCallback(() => {
    if (supabase) {
      void supabase.auth.signOut();
    }
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
      isDemoMode,
      signInDemo,
      signUpDemo,
      completeVerificationDemo,
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
      isDemoMode,
      signInDemo,
      signUpDemo,
      completeVerificationDemo,
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
