"use client";

import { useMemo, type MouseEvent } from "react";
import { motion, useMotionValue } from "framer-motion";
import { SiteHeader } from "@/components/site-header";
import { useLanguage } from "@/contexts/language-context";


type PolicySection = {
  title: string;
  body: string;
  accent: string;
  order: number;
};

type PolicyCardProps = {
  section: PolicySection;
  isArabic: boolean;
};

const translations = {
  en: {
    title: "Policies",
    intro:
      "These policies define how Red-Flag handles identity, reports, evidence, legal responsibility, and account governance across the platform.",
    sections: [
      {
        title: "1) Access & verification policy",
        body: "Search and reporting features require a verified account. Individuals complete phone and identity steps; companies complete commercial registry and official email checks.",
        accent: "bg-emerald-500/10 text-emerald-200",
        order: 1,
      },
      {
        title: "2) Content responsibility policy",
        body: "Uploaders are solely responsible for the accuracy, legality, and ownership rights of submitted reports and files. Red-Flag provides hosting workflows and does not independently certify factual truth.",
        accent: "bg-slate-500/10 text-slate-200",
        order: 2,
      },
      {
        title: "3) Evidence privacy policy",
        body: "Evidence documents are private by default and never publicly listed in search. Access is controlled, auditable, and limited by authorization and payment workflows when enabled.",
        accent: "bg-red-500/10 text-red-200",
        order: 3,
      },
      {
        title: "4) Abuse & enforcement policy",
        body: "False reporting, impersonation, harassment, malicious uploads, or policy circumvention may result in immediate suspension, permanent bans, and potential legal escalation under applicable law.",
        accent: "bg-emerald-500/10 text-emerald-200",
        order: 4,
      },
      {
        title: "5) Moderation policy",
        body: "Admin reviewers can mark reports as pending, approved, or rejected based on policy checks, supporting context, and compliance requirements.",
        accent: "bg-slate-500/10 text-slate-200",
        order: 5,
      },
    ],
  },
  ar: {
    title: "السياسات واللوائح العامة",
    intro:
      "تحدد هذه السياسات كيفية تعامل منصة Red-Flag مع الهوية الرقمية، البلاغات، الأدلة الجنائية، المسؤولية القانونية، وحوكمة الحسابات.",
    sections: [
      {
        title: "1) سياسة الوصول والتحقق من الهوية",
        body: "تتطلب ميزات البحث وتقديم البلاغات حساباً موثقاً. يكمل الأفراد خطوات التحقق من الهاتف والهوية الرقمية؛ بينما تكمل الشركات فحص السجل التجاري والبريد الرسمي.",
        accent: "bg-emerald-500/10 text-emerald-200",
        order: 1,
      },
      {
        title: "2) سياسة المسؤولية عن المحتوى",
        body: "المبلغون وحدهم المسؤولون عن دقة وقانونية وملكية البلاغات والملفات المرفوعة. توفر منصة Red-Flag مسارات استضافة رقمية ولا تصادق بشكل مستقل على الحقائق.",
        accent: "bg-slate-500/10 text-slate-200",
        order: 2,
      },
      {
        title: "3) سياسة خصوصية الأدلة الرقمية",
        body: "تعتبر مستندات وأدلة البلاغات سرية وخاصة بشكل افتراضي ولا تظهر أبداً في نتائج البحث العامة. الوصول إليها يخضع لرقابة صارمة ومسارات دفع آمنة عند تفعيلها.",
        accent: "bg-red-500/10 text-red-200",
        order: 3,
      },
      {
        title: "4) سياسة مكافحة إساءة الاستخدام",
        body: "البلاغات الكاذبة، انتحال الشخصية، المضايقات، أو محاولة اختراق السياسات تؤدي إلى الحظر الدائم والفوري للحساب، مع الملاحقة القانونية تحت طائلة القوانين السارية.",
        accent: "bg-emerald-500/10 text-emerald-200",
        order: 4,
      },
      {
        title: "5) سياسة الإشراف والمراجعة",
        body: "يقوم مراجعو النظام (الأدمن) بفحص البلاغات وتصنيفها كـ \"معلقة، مقبولة، أو مرفوضة\" بناءً على معايير التحقق، الأدلة الداعمة، ومتطلبات الامتثال القانوني.",
        accent: "bg-slate-500/10 text-slate-200",
        order: 5,
      },
    ],
  },
} as const;

function PolicyCard({ section, isArabic }: PolicyCardProps) {
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 24;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 18;
    rotateX.set(-y);
    rotateY.set(x);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      className="group relative overflow-hidden rounded-[2rem] border border-slate-800/90 bg-slate-900/40 p-6 backdrop-blur-md shadow-[0_20px_90px_rgba(16,185,129,0.08)]"
      style={{
        perspective: 1200,
        transformStyle: "preserve-3d",
        rotateX,
        rotateY,
      }}
      transition={{ type: "spring", stiffness: 170, damping: 20 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="pointer-events-none absolute inset-x-6 top-6 h-1 rounded-full bg-gradient-to-r from-emerald-400/60 via-slate-500/30 to-red-500/60 opacity-80 blur-xl" />
      <div className={`relative z-10 ${isArabic ? "text-right" : "text-left"}`}>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300 ${section.accent}`}
        >
          {isArabic ? "المرحلة" : "Step"} {section.order}
        </span>
        <h3
          className="mt-6 text-xl font-semibold text-slate-50"
          style={{ textShadow: "0 0 20px rgba(255,255,255,0.08)" }}
        >
          {section.title}
        </h3>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          {section.body}
        </p>
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-[2rem] border border-white/5 bg-[radial-gradient(circle_at_top_left,_rgba(248,113,113,0.14),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(52,211,153,0.12),_transparent_30%)]" />
    </motion.div>
  );
}

export default function PoliciesPage() {
  const { language, isArabic } = useLanguage();

  const copy = useMemo(
    () => (language === "ar" ? translations.ar : translations.en),
    [language],
  );

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="relative min-h-dvh overflow-hidden bg-[#050712] text-slate-100"
    >
      <SiteHeader />
      
      <main className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-4xl space-y-6">
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-300/70">Secure · Transparent · Immersive</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {copy.title}
          </h1>
          <p className="max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
            {copy.intro}
          </p>
        </div>

        <section className="grid gap-6 lg:grid-cols-2">
          {copy.sections.map((section, index) => (
            <div
              key={section.title}
              className={
                index % 2 === 0
                  ? "translate-y-0 lg:translate-y-6"
                  : "translate-y-8 lg:-translate-y-4"
              }
            >
              <PolicyCard section={section} isArabic={isArabic} />
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
