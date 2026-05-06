"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AppLanguage = "en" | "ar";

type LanguageContextValue = {
  language: AppLanguage;
  isArabic: boolean;
  setLanguage: (language: AppLanguage) => void;
  toggleLanguage: () => void;
};

const STORAGE_KEY = "red-flag-language";
const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("en");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const stored: string | null = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "ar" || stored === "en") {
        setLanguageState(stored);
      }
    } catch {
      /* Safari private mode / blocked storage — keep default language */
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return;
    }
    try {
      document.documentElement.lang = language;
      document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      document.documentElement.lang = language;
      document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    }
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => {
    return {
      language,
      isArabic: language === "ar",
      setLanguage: (next: AppLanguage) => setLanguageState(next),
      toggleLanguage: () =>
        setLanguageState((prev) => (prev === "en" ? "ar" : "en")),
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}

