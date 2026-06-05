"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { type SVGProps, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { LandingBnnScene, type FocusPoint } from "@/components/landing-bnn-scene";

type AttentionSection = "search" | "guarantees" | null;

function FlagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 21V4a1 1 0 0 1 1-1h14l-3 5 3 5H5v8" />
    </svg>
  );
}

export function HomeContent() {
  const { user, isHydrated } = useAuth();
  const { isArabic } = useLanguage();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [focusPoint, setFocusPoint] = useState<FocusPoint>({ x: 0, y: 0 });
  const [attentionSection, setAttentionSection] = useState<AttentionSection>(null);
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const primaryHref: string = user?.isVerified ? "/dashboard" : "/register";
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    let isMounted = true;
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        if (!isMounted) {
          return;
        }
        const hasVideoInput = devices.some(
          (device) => device.kind === "videoinput",
        );
        setHasCamera(hasVideoInput);
      })
      .catch(() => {
        if (isMounted) {
          setHasCamera(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const container = wrapperRef.current;
    if (!container) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * -2;
      setFocusPoint({ x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) });
    };

    const handlePointerLeave = () => {
      setFocusPoint({ x: 0, y: 0 });
      setAttentionSection(null);
    };

    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerleave", handlePointerLeave);
    return () => {
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  const copy = isArabic
    ? {
        badge: "بنية نزاهة موثقة",
        title: "شبكة احترافية عالية الثقة للنزاهة الموثقة.",
        subtitle:
          "يوفر Red-Flag تحققًا متقدمًا ومشاركة بيانات آمنة بين الجهات الموثقة.",
        join: "انضم إلى الشبكة",
        searchRegistry: "ابحث في السجل",
        learnMore: "اعرف المزيد",
        searchPlaceholder: "ابحث باسم الكيان أو رقم السجل أو رقم الهاتف.",
        searchButton: "بحث",
        legend: "دليل الأعلام",
        red: "🔴 راية حمراء: توجد بلاغات أو مؤشرات محتملة.",
        green: "🟢 راية خضراء: لا توجد سجلات حالية.",
        guarantees: "ضمانات المنصة",
        g1: "وصول موثق فقط: التسجيل والتحقق من الهوية شرط لكل عمليات البحث.",
        g2: "تقييد آمن للأدلة: الوصول للأدلة الخاصة يتطلب مصادقة.",
        g3: "وصول مدفوع للبيانات: عرض الأدلة المحمية خدمة برسوم لضمان الاستعلام الجاد.",
        g4: "بوابة مسؤولية رقمية: كل رفع يتطلب موافقة رقمية على الشروط لضمان المساءلة.",
      }
    : {
        badge: "Verified Integrity Infrastructure",
        title: "A professional, high-trust network for verified integrity.",
        subtitle:
          "Red-Flag provides advanced verification and secure data sharing between verified entities.",
        join: "Join the Network",
        searchRegistry: "Search Registry",
        learnMore: "Learn More",
        searchPlaceholder:
          "Search by Entity Name, Registration Number, or Phone.",
        searchButton: "Search",
        legend: "Flag Legend",
        red: "🔴 Red-Flag: Potential issues or reports found.",
        green: "🟢 Green-Flag: No current records or reports found.",
        guarantees: "PLATFORM GUARANTEES",
        g1: "Verified Access Only: Registration and identity verification are prerequisites for all searches.",
        g2: "Secure Evidence Gating: Access to private evidence is strictly controlled and requires authentication.",
        g3: "Monetized Data Access: Viewing protected evidence is a fee-based service to ensure qualified inquiries.",
        g4: "Digital T.O.S Liability Gate: All uploads require digitally signed Terms of Service, ensuring uploader accountability.",
      };
  const searchCardActive = attentionSection === "search" || isSearchFocused;
  const guaranteesActive = attentionSection === "guarantees";

  return (
    <div ref={wrapperRef} className="relative overflow-hidden">
      <LandingBnnScene focusPoint={focusPoint} />
      <p className="sr-only">
        {hasCamera
          ? "Nano-BNN attention: webcam source enabled."
          : "Nano-BNN attention: pointer fallback active."}
      </p>
      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-16">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-400/95">
            {copy.badge}
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-50 sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400">
            {copy.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {isHydrated ? (
              <Link
                href={primaryHref}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-900/25 hover:bg-red-500"
              >
                {copy.join}
              </Link>
            ) : null}
            {user?.isVerified ? (
              <Link
                href="/search"
                className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-900"
              >
                {copy.searchRegistry}
              </Link>
            ) : (
              <Link
                href="/about"
                className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-900"
              >
                {copy.learnMore}
              </Link>
            )}
          </div>
          <motion.div
            initial={false}
            animate={{
              scale: searchCardActive ? 1.006 : 1,
              translateZ: searchCardActive ? 20 : 0,
              boxShadow: searchCardActive
                ? "0 32px 90px rgba(16,185,129,0.16)"
                : "0 20px 40px rgba(0,0,0,0.14)",
              filter: searchCardActive ? "contrast(1.05)" : "contrast(1)",
            }}
            transition={{ type: "spring", stiffness: 180, damping: 24 }}
            className="mt-8 rounded-2xl border border-slate-800/90 bg-slate-900/60 p-4 ring-1 ring-slate-700/40 backdrop-blur-sm"
            onMouseEnter={() => setAttentionSection("search")}
            onMouseLeave={() => setAttentionSection(isSearchFocused ? "search" : null)}
          >
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <div className="relative">
                <motion.input
                  type="search"
                  placeholder={copy.searchPlaceholder}
                  onFocus={() => {
                    setIsSearchFocused(true);
                    setAttentionSection("search");
                  }}
                  onBlur={() => {
                    setIsSearchFocused(false);
                    setAttentionSection(null);
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/85 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-red-500/60 focus:ring-2 focus:ring-red-500/25"
                />
                <Link
                  href="/search"
                  className="mt-3 inline-flex w-full justify-center rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-red-900/25 transition hover:bg-red-500 sm:w-auto"
                >
                  {copy.searchButton}
                </Link>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-300 md:max-w-[260px]">
                <div className="flex items-center gap-2">
                  <FlagIcon
                    className={`h-4 w-4 transition-all duration-300 ${
                      searchCardActive
                        ? "text-emerald-300 scale-110 opacity-100"
                        : "text-slate-500 opacity-80"
                    }`}
                  />
                  <p className="font-semibold uppercase tracking-wide text-slate-400">
                    {copy.legend}
                  </p>
                </div>
                <p className="mt-1 text-red-300">{copy.red}</p>
                <p className="mt-1 text-emerald-300">{copy.green}</p>
              </div>
            </div>
          </motion.div>
        </div>
        <motion.div
          initial={false}
          animate={{
            scale: guaranteesActive ? 1.007 : 1,
            translateZ: guaranteesActive ? 18 : 0,
            rotateX: guaranteesActive ? 2 : 0,
            boxShadow: guaranteesActive
              ? "0 36px 110px rgba(16,185,129,0.18)"
              : "0 18px 50px rgba(0,0,0,0.14)",
            filter: guaranteesActive
              ? "drop-shadow(0 0 32px rgba(16,185,129,0.2))"
              : "none",
          }}
          transition={{ type: "spring", stiffness: 170, damping: 26 }}
          className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/92 to-slate-950/95 p-6 shadow-2xl shadow-black/50 ring-1 ring-slate-800/80"
          onMouseEnter={() => setAttentionSection("guarantees")}
          onMouseLeave={() => setAttentionSection(null)}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            {copy.guarantees}
          </h2>
          <ul className="mt-4 space-y-4 text-sm text-slate-300">
            <li className="flex gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              <span>
                {copy.g1}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              <span>
                {copy.g2}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              <span>
                {copy.g3}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              <span>
                {copy.g4}
              </span>
            </li>
          </ul>
        </motion.div>
      </div>
    </main>
  </div>
  );
}
