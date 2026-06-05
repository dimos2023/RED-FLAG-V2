"use client";

import dynamic from "next/dynamic";
import { Suspense, useMemo, type MouseEvent } from "react";
import { motion, useMotionValue } from "framer-motion";
import { SiteHeader } from "@/components/site-header";
import { useLanguage } from "@/contexts/language-context";

const Policies3DBackground = dynamic(
  () => import("@/components/policies-3d-background"),
  { ssr: false },
);

type PolicySection = {
  title: string;
  body: string;
  accent: string;
  order: number;
};

type PolicyCardProps = {
  section: PolicySection;
};

function PolicyCard({ section }: PolicyCardProps) {
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
      <div className="relative z-10">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300 ${section.accent}`}
        >
          Step {section.order}
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
  const { isArabic } = useLanguage();

  const copy = useMemo(
    () =>
      isArabic
        ? {
            title: "السياسات",
            intro:
              "توضح هذه السياسات كيفية تعامل Red-Flag مع الهوية والبلاغات والأدلة والمسؤولية القانونية وحوكمة الحسابات.",
            sections: [
              {
                title: "Access & verification policy",
                body: "Search and reporting features require a verified account. Individuals complete phone and identity steps; companies complete commercial registry and official email checks.",
                accent: "bg-emerald-500/10 text-emerald-200",
                order: 1,
              },
              {
                title: "Content responsibility policy",
                body: "Uploaders are solely responsible for the accuracy, legality, and ownership rights of submitted reports and files. Red-Flag provides hosting workflows and does not independently certify factual truth.",
                accent: "bg-slate-500/10 text-slate-200",
                order: 2,
              },
              {
                title: "Evidence privacy policy",
                body: "Evidence documents are private by default and never publicly listed in search. Access is controlled, auditable, and limited by authorization and payment workflows when enabled.",
                accent: "bg-red-500/10 text-red-200",
                order: 3,
              },
              {
                title: "Abuse & enforcement policy",
                body: "False reporting, impersonation, harassment, malicious uploads, or policy circumvention may result in immediate suspension, permanent bans, and potential legal escalation under applicable law.",
                accent: "bg-emerald-500/10 text-emerald-200",
                order: 4,
              },
              {
                title: "Moderation policy",
                body: "Admin reviewers can mark reports as pending, approved, or rejected based on policy checks, supporting context, and compliance requirements.",
                accent: "bg-slate-500/10 text-slate-200",
                order: 5,
              },
            ],
          }
        : {
            title: "Policies",
            intro:
              "These policies define how Red-Flag handles identity, reports, evidence, legal responsibility, and account governance across the platform.",
            sections: [
              {
                title: "Access & verification policy",
                body: "Search and reporting features require a verified account. Individuals complete phone and identity steps; companies complete commercial registry and official email checks.",
                accent: "bg-emerald-500/10 text-emerald-200",
                order: 1,
              },
              {
                title: "Content responsibility policy",
                body: "Uploaders are solely responsible for the accuracy, legality, and ownership rights of submitted reports and files. Red-Flag provides hosting workflows and does not independently certify factual truth.",
                accent: "bg-slate-500/10 text-slate-200",
                order: 2,
              },
              {
                title: "Evidence privacy policy",
                body: "Evidence documents are private by default and never publicly listed in search. Access is controlled, auditable, and limited by authorization and payment workflows when enabled.",
                accent: "bg-red-500/10 text-red-200",
                order: 3,
              },
              {
                title: "Abuse & enforcement policy",
                body: "False reporting, impersonation, harassment, malicious uploads, or policy circumvention may result in immediate suspension, permanent bans, and potential legal escalation under applicable law.",
                accent: "bg-emerald-500/10 text-emerald-200",
                order: 4,
              },
              {
                title: "Moderation policy",
                body: "Admin reviewers can mark reports as pending, approved, or rejected based on policy checks, supporting context, and compliance requirements.",
                accent: "bg-slate-500/10 text-slate-200",
                order: 5,
              },
            ],
          },
    [isArabic],
  );

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#050712] text-slate-100">
      <SiteHeader />
      <Suspense fallback={null}>
        <Policies3DBackground />
      </Suspense>
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
              <PolicyCard section={section} />
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
