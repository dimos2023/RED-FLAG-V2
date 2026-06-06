"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { type SVGProps, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAdminStatus } from "@/hooks/use_admin_status";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";

function GlobeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function SiteHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState<boolean>(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const languageMenuRef = useRef<HTMLDivElement | null>(null);
  const languageMobileMenuRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname() ?? "";
  const { user, isHydrated, signOut, adminRoleCheckNotice, dismissAdminRoleCheckNotice } =
    useAuth();
  const { isAdmin, isAdminResolved } = useAdminStatus();
  const { language, isArabic, setLanguage } = useLanguage();
  const copy = isArabic
    ? {
        home: "الرئيسية",
        about: "عن المنصة",
        policies: "السياسات",
        dashboard: "لوحة التحكم",
        search: "البحث",
        admin: "الإدارة",
        report: "بلاغ",
        signOut: "تسجيل الخروج",
        profile: "الملف الشخصي",
        completeVerification: "استكمال التحقق",
        signIn: "تسجيل الدخول",
        register: "إنشاء حساب",
        langButton: "EN",
        menu: "القائمة",
        close: "إغلاق",
      }
    : {
        home: "Home",
        about: "About",
        policies: "Policies",
        dashboard: "Dashboard",
        search: "Search",
        admin: "Admin panel",
        report: "Report",
        profile: "Profile",
        signOut: "Sign out",
        completeVerification: "Complete verification",
        signIn: "Sign in",
        register: "Register",
        langButton: "AR",
        menu: "Menu",
        close: "Close",
      };

  const activeLink = (href: string): boolean => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const linkBaseClasses =
    "rounded-lg px-2 py-1.5 sm:px-2 sm:py-1 transition-colors duration-200 ease-out text-sm sm:text-base h-9 sm:h-auto flex items-center justify-center sm:justify-start";

  const linkClass = (href: string) =>
    `${linkBaseClasses} ${
      activeLink(href)
        ? "bg-emerald-600/15 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.12)]"
        : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
    }`;
  const mobileAccountLinkClasses =
    "block w-full rounded-lg px-4 py-3 text-slate-200 transition-colors duration-200 hover:bg-slate-800/50";

  const userLabel =
    user?.fullName?.trim() || user?.email?.trim() ||
    (isArabic ? "الحساب" : "Account");

  useEffect(() => {
    if (!isUserMenuOpen) {
      return;
    }
    function handleOutsideClick(event: MouseEvent) {
      if (!userMenuRef.current) {
        return;
      }
      if (!userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [isUserMenuOpen]);

  useEffect(() => {
    if (!isLanguageMenuOpen) {
      return;
    }
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (
        languageMenuRef.current?.contains(target) ||
        languageMobileMenuRef.current?.contains(target)
      ) {
        return;
      }
      setIsLanguageMenuOpen(false);
    }
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [isLanguageMenuOpen]);

  const handleLanguageChange = (locale: "en" | "ar") => {
    setLanguage(locale);
    setIsLanguageMenuOpen(false);
  };

  const languageDropdown = (
    <div ref={languageMenuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsLanguageMenuOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isLanguageMenuOpen}
        aria-label={isArabic ? "اختر اللغة" : "Select language"}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 transition-colors duration-200 ease-out hover:border-emerald-400 hover:text-emerald-400"
      >
        <GlobeIcon className="h-5 w-5" />
      </button>
      {isLanguageMenuOpen ? (
        <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
          <button
            type="button"
            onClick={() => handleLanguageChange("en")}
            className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors duration-150 ease-out ${
              language === "en"
                ? "bg-slate-900 text-emerald-300"
                : "text-slate-200 hover:bg-slate-900"
            }`}
          >
            English
            {language === "en" ? <span>✓</span> : null}
          </button>
          <button
            type="button"
            onClick={() => handleLanguageChange("ar")}
            className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors duration-150 ease-out ${
              language === "ar"
                ? "bg-slate-900 text-emerald-300"
                : "text-slate-200 hover:bg-slate-900"
            }`}
          >
            العربية
            {language === "ar" ? <span>✓</span> : null}
          </button>
        </div>
      ) : null}
    </div>
  );

  const userDropdown = user ? (
    <div ref={userMenuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsUserMenuOpen((prev) => !prev)}
        className="rounded-lg border border-slate-700 px-2 py-1 text-slate-200 transition-colors duration-200 ease-out hover:bg-slate-900"
        aria-expanded={isUserMenuOpen}
      >
        <motion.span
          className="inline-flex items-center gap-2 text-sm font-medium"
          whileHover={{
            textShadow: "0 0 18px rgba(16,185,129,0.65)",
          }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
        >
          <span>{userLabel}</span>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </motion.span>
      </button>
      {isUserMenuOpen ? (
        <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
          <Link
            href="/profile"
            onClick={() => setIsUserMenuOpen(false)}
            className="block px-4 py-3 text-sm text-slate-100 hover:bg-slate-900"
          >
            {copy.profile}
          </Link>
          <button
            type="button"
            onClick={() => {
              setIsUserMenuOpen(false);
              signOut();
            }}
            className="w-full px-4 py-3 text-left text-sm text-slate-100 hover:bg-slate-900"
          >
            {copy.signOut}
          </button>
        </div>
      ) : null}
    </div>
  ) : null;
  const mobileProfileIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="mr-2 inline-block h-5 w-5 text-emerald-300 md:hidden"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
      />
    </svg>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      {adminRoleCheckNotice === "timeout" ? (
        <div
          role="status"
          className="border-b border-amber-900/40 bg-amber-950/50 px-4 py-2 text-center text-xs text-amber-100"
        >
          <span className="inline-block max-w-3xl">
            {isArabic
              ? "انتهت مهلة التحقق من صلاحيات الإدارة (10 ث). تمت المتابعة كمستخدم عادي."
              : "Admin role check timed out (10s). Proceeding as a regular user."}
          </span>{" "}
          <button
            type="button"
            onClick={() => dismissAdminRoleCheckNotice()}
            className="ml-2 underline decoration-amber-400/80 underline-offset-2 hover:text-white"
          >
            {isArabic ? "إخفاء" : "Dismiss"}
          </button>
        </div>
      ) : null}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
        <Link href="/" className="group flex items-center gap-2">
          <span className="relative h-6 w-5 overflow-hidden rounded-[2px] [clip-path:polygon(50%_0%,96%_18%,86%_84%,50%_100%,14%_84%,4%_18%)] ring-1 ring-red-300/50 shadow-[0_0_16px_rgba(220,38,38,0.45)]">
            <span className="absolute inset-0 bg-gradient-to-b from-slate-100 via-slate-300 to-slate-700" />
            <span className="absolute inset-[2px] [clip-path:polygon(50%_0%,96%_18%,86%_84%,50%_100%,14%_84%,4%_18%)] bg-gradient-to-b from-red-300/90 via-red-500/80 to-red-900/90" />
            <span className="absolute left-1/2 top-[44%] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
          </span>
          <span className="text-sm font-semibold tracking-wide text-slate-100 transition group-hover:text-red-400">
            Red-Flag
          </span>
        </Link>
        <nav className="hidden items-center gap-2 text-sm lg:flex lg:gap-4">
          <Link
            href="/"
            className={linkClass("/")}
          >
            {copy.home}
          </Link>
          <Link
            href="/about"
            className={linkClass("/about")}
          >
            {copy.about}
          </Link>
          <Link
            href="/policies"
            className={linkClass("/policies")}
          >
            {copy.policies}
          </Link>
          {!isHydrated ? (
            <span className="h-4 w-24 animate-pulse rounded bg-slate-800" />
          ) : !user ? (
            <>
              <Link
                href="/login"
                className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              >
                {copy.signIn}
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-slate-800 px-3 py-1.5 font-medium text-slate-100 ring-1 ring-slate-700 hover:bg-slate-700"
              >
                {copy.register}
              </Link>
            </>
          ) : !isAdminResolved ? (
            <>
              <span className="h-4 w-28 animate-pulse rounded bg-slate-800" />
              {userDropdown}
            </>
          ) : user.isVerified ? (
            <>
              <Link href="/dashboard" className={linkClass("/dashboard")}>{copy.dashboard}</Link>
              {isAdmin && isAdminResolved ? (
                <Link
                  href="/admin/requests"
                  className={linkClass("/admin")}
                >
                  {copy.admin}
                </Link>
              ) : null}
              <Link href="/search" className={linkClass("/search")}>{copy.search}</Link>
              <Link
                href="/report"
                className={activeLink("/report") ? "rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 transition-colors duration-200 ease-out" : "rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white shadow-lg shadow-red-900/30 hover:bg-red-500"}
              >
                {copy.report}
              </Link>
              {userDropdown}
            </>
          ) : isAdmin && isAdminResolved ? (
            <>
              <Link
                href="/admin/requests"
                className={linkClass("/admin")}
              >
                {copy.admin}
              </Link>
              {userDropdown}
            </>
          ) : (
            <>
              <Link
                href="/register"
                className="rounded-lg px-2 py-1 text-amber-400 hover:bg-slate-900"
              >
                {copy.completeVerification}
              </Link>
              {userDropdown}
            </>
          )}
          {languageDropdown}
        </nav>
        <div className="flex items-center gap-2 lg:hidden">
          <div ref={languageMobileMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsLanguageMenuOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={isLanguageMenuOpen}
              aria-label={isArabic ? "اختر اللغة" : "Select language"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 transition-colors duration-200 ease-out hover:border-emerald-400 hover:text-emerald-400"
            >
              <GlobeIcon className="h-5 w-5" />
            </button>
            {isLanguageMenuOpen ? (
              <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
                <button
                  type="button"
                  onClick={() => handleLanguageChange("en")}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors duration-150 ease-out ${
                    language === "en"
                      ? "bg-slate-900 text-emerald-300"
                      : "text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  English
                  {language === "en" ? <span>✓</span> : null}
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange("ar")}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors duration-150 ease-out ${
                    language === "ar"
                      ? "bg-slate-900 text-emerald-300"
                      : "text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  العربية
                  {language === "ar" ? <span>✓</span> : null}
                </button>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900 min-w-[44px]"
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? copy.close : copy.menu}
          >
            {isMobileMenuOpen ? copy.close : copy.menu}
          </button>
        </div>
      </div>
      {isMobileMenuOpen ? (
        <div className="border-t border-slate-800/80 bg-slate-950/95 px-4 py-3 lg:hidden">
          <div className="mx-auto grid max-w-6xl gap-1.5 text-sm">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-slate-300 hover:bg-slate-900 hover:text-slate-100 break-words h-11 flex items-center"
            >
              {copy.home}
            </Link>
            <Link
              href="/about"
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-slate-300 hover:bg-slate-900 hover:text-slate-100 break-words h-11 flex items-center"
            >
              {copy.about}
            </Link>
            <Link
              href="/policies"
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-slate-300 hover:bg-slate-900 hover:text-slate-100 break-words h-11 flex items-center"
            >
              {copy.policies}
            </Link>
            {!isHydrated ? (
              <span className="h-8 w-full animate-pulse rounded-lg bg-slate-800" />
            ) : !user ? (
              <>
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={mobileAccountLinkClasses}
                >
                  {copy.signIn}
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-lg bg-slate-800 px-3 py-2 font-medium text-slate-100 ring-1 ring-slate-700 hover:bg-slate-700"
                >
                  {copy.register}
                </Link>
              </>
            ) : !isAdminResolved ? (
              <>
                <span className="h-8 w-full animate-pulse rounded-lg bg-slate-800" />
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={mobileAccountLinkClasses}
                >
                  <span className="inline-flex items-center gap-2">
                    {mobileProfileIcon}
                    <span>{copy.profile}</span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    signOut();
                  }}
                  className="rounded-lg px-3 py-2 text-left text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                >
                  {copy.signOut}
                </button>
              </>
            ) : user.isVerified ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-slate-100"
                >
                  {copy.dashboard}
                </Link>
                {isAdmin && isAdminResolved ? (
                  <Link
                    href="/admin/requests"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="rounded-lg px-3 py-2 text-amber-300 hover:bg-slate-900"
                  >
                    {copy.admin}
                  </Link>
                ) : null}
                <Link
                  href="/search"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-slate-100"
                >
                  {copy.search}
                </Link>
                <Link
                  href="/report"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-lg bg-red-600 px-3 py-2 font-medium text-white hover:bg-red-500"
                >
                  {copy.report}
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={mobileAccountLinkClasses}
                >
                  <span className="inline-flex items-center gap-2">
                    {mobileProfileIcon}
                    <span>{copy.profile}</span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    signOut();
                  }}
                  className="rounded-lg px-3 py-2 text-left text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                >
                  {copy.signOut}
                </button>
              </>
            ) : isAdmin && isAdminResolved ? (
              <>
                <Link
                  href="/admin/requests"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-amber-300 hover:bg-slate-900"
                >
                  {copy.admin}
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={mobileAccountLinkClasses}
                >
                  <span className="inline-flex items-center gap-2">
                    {mobileProfileIcon}
                    <span>{copy.profile}</span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    signOut();
                  }}
                  className="rounded-lg px-3 py-2 text-left text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                >
                  {copy.signOut}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-amber-300 hover:bg-slate-900"
                >
                  {copy.completeVerification}
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={mobileAccountLinkClasses}
                >
                  <span className="inline-flex items-center gap-2">
                    {mobileProfileIcon}
                    <span>{copy.profile}</span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    signOut();
                  }}
                  className="rounded-lg px-3 py-2 text-left text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                >
                  {copy.signOut}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
