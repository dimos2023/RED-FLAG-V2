"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useLayoutEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";

const HEADER_PORTAL_ID: string = "rf-site-header-portal";

export function SiteHeader() {
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    let host: HTMLElement | null = document.getElementById(HEADER_PORTAL_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = HEADER_PORTAL_ID;
      document.body.appendChild(host);
    }
    setPortalHost(host);
    return () => {
      /* keep host mounted for route transitions */
    };
  }, []);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const {
    user,
    isAdmin,
    isAdminRoleResolved,
    isHydrated,
    signOut,
  } = useAuth();
  const { language, isArabic, toggleLanguage } = useLanguage();
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
        admin: "Admin",
        report: "Report",
        signOut: "Sign out",
        completeVerification: "Complete verification",
        signIn: "Sign in",
        register: "Register",
        langButton: "AR",
        menu: "Menu",
        close: "Close",
      };

  const headerInner: ReactNode = (
    <>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
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
          <button
            type="button"
            onClick={toggleLanguage}
            className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-900"
            aria-label={language === "en" ? "Switch to Arabic" : "Switch to English"}
          >
            {copy.langButton}
          </button>
          <Link
            href="/"
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
          >
            {copy.home}
          </Link>
          <Link
            href="/about"
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
          >
            {copy.about}
          </Link>
          <Link
            href="/policies"
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
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
          ) : !isAdminRoleResolved ? (
            <>
              <span className="h-4 w-28 animate-pulse rounded bg-slate-800" />
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-lg px-2 py-1 text-slate-500 hover:text-slate-300"
              >
                {copy.signOut}
              </button>
            </>
          ) : user.isVerified ? (
            <>
              <Link href="/dashboard" className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-900 hover:text-slate-200">{copy.dashboard}</Link>
              <Link href="/search" className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-900 hover:text-slate-200">{copy.search}</Link>
              {isAdmin ? (
                <Link
                  href="/admin/requests"
                  className="rounded-lg px-2 py-1 text-amber-400/90 hover:bg-slate-900 hover:text-amber-300"
                >
                  {copy.admin}
                </Link>
              ) : null}
              <Link
                href="/report"
                className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white shadow-lg shadow-red-900/30 hover:bg-red-500"
              >
                {copy.report}
              </Link>
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-lg px-2 py-1 text-slate-500 hover:text-slate-300"
              >
                {copy.signOut}
              </button>
            </>
          ) : isAdmin ? (
            <>
              <Link
                href="/admin/requests"
                className="rounded-lg px-2 py-1 text-amber-400/90 hover:bg-slate-900 hover:text-amber-300"
              >
                {copy.admin}
              </Link>
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-lg px-2 py-1 text-slate-500 hover:text-slate-300"
              >
                {copy.signOut}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/register"
                className="rounded-lg px-2 py-1 text-amber-400 hover:bg-slate-900"
              >
                {copy.completeVerification}
              </Link>
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-lg px-2 py-1 text-slate-500 hover:text-slate-300"
              >
                {copy.signOut}
              </button>
            </>
          )}
        </nav>
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={toggleLanguage}
            className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-900"
            aria-label={language === "en" ? "Switch to Arabic" : "Switch to English"}
          >
            {copy.langButton}
          </button>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-900"
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? copy.close : copy.menu}
          >
            {isMobileMenuOpen ? copy.close : copy.menu}
          </button>
        </div>
      </div>
      {isMobileMenuOpen ? (
        <div className="border-t border-slate-800/80 bg-slate-950/95 px-4 py-3 lg:hidden">
          <div className="mx-auto grid max-w-6xl gap-2 text-sm">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-slate-100"
            >
              {copy.home}
            </Link>
            <Link
              href="/about"
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-slate-100"
            >
              {copy.about}
            </Link>
            <Link
              href="/policies"
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-slate-100"
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
                  className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-slate-100"
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
            ) : !isAdminRoleResolved ? (
              <>
                <span className="h-8 w-full animate-pulse rounded-lg bg-slate-800" />
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
                <Link
                  href="/search"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-slate-100"
                >
                  {copy.search}
                </Link>
                {isAdmin ? (
                  <Link
                    href="/admin/requests"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="rounded-lg px-3 py-2 text-amber-300 hover:bg-slate-900"
                  >
                    {copy.admin}
                  </Link>
                ) : null}
                <Link
                  href="/report"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-lg bg-red-600 px-3 py-2 font-medium text-white hover:bg-red-500"
                >
                  {copy.report}
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
            ) : isAdmin ? (
              <>
                <Link
                  href="/admin/requests"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-amber-300 hover:bg-slate-900"
                >
                  {copy.admin}
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
    </>
  );

  const headerClassName: string =
    portalHost != null
      ? "fixed top-0 left-0 right-0 z-[100] border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md"
      : "sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md";

  return (
    <>
      {portalHost ? (
        <div
          className="pointer-events-none h-14 shrink-0 md:h-[52px]"
          aria-hidden
        />
      ) : null}
      {portalHost ? (
        createPortal(
          <header className={headerClassName}>{headerInner}</header>,
          portalHost,
        )
      ) : (
        <header className={headerClassName}>{headerInner}</header>
      )}
    </>
  );
}
