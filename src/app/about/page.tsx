"use client";

import { SiteHeader } from "@/components/site-header";
import { useLanguage } from "@/contexts/language-context";

export default function AboutPage() {
  const { isArabic } = useLanguage();
  const copy = isArabic
    ? {
        title: "عن Red-Flag",
        intro:
          "Red-Flag منصة احترافية للإبلاغ عن الاحتيال والتحقق تهدف إلى خفض مخاطر الثقة ورفع جودة الفحص المسبق وخلق بيئة رقمية وتجارية أكثر أمانًا.",
        why: "لماذا وُجدت المنصة",
        whyItems: [
          "مساعدة المستخدمين على اكتشاف الكيانات المشبوهة قبل إتمام المعاملات.",
          "تجميع إشارات الاحتيال بشكل منظم ضمن سير عمل موثوق.",
          "حفظ الإطار القانوني عبر مسؤولية واضحة للرافع ودور استضافة فقط.",
          "توفير إدارة أدلة آمنة مع كشف منضبط ومدفوع.",
        ],
        flow: "ماذا تقدم Red-Flag من البداية للنهاية",
        flowItems: [
          "1. إلزامية التحقق للأفراد والشركات قبل الوصول.",
          "2. استقبال البلاغات عبر نموذج متعدد الخطوات.",
          "3. تخزين الأدلة في خزنة خاصة محمية.",
          "4. إظهار نتائج بحث غير حساسة للمستخدمين الموثقين فقط.",
          "5. تفعيل مسار طلب/دفع قبل مراجعة الأدلة.",
          "6. دعم مراجعة إدارية للموافقة أو الرفض مع سياق تدقيقي.",
        ],
        impact: "الأثر والقيمة",
        impactBody:
          "المنصة مصممة لتقليل التعرض للاحتيال، وزيادة الثقة في القرار، وتحويل فحص المخاطر إلى عملية قابلة للتكرار مع احترام الخصوصية والامتثال.",
      }
    : {
        title: "About Red-Flag",
        intro:
          "Red-Flag is a professional fraud reporting and verification platform built to reduce trust risk, improve due diligence, and create a safer digital and commercial environment for individuals and companies.",
        why: "Why this platform exists",
        whyItems: [
          "To help users identify suspicious entities before transactions happen.",
          "To centralize structured fraud signals in one trusted workflow.",
          "To preserve legal boundaries with clear uploader liability and hosting-only role.",
          "To provide secure evidence management with controlled, paid disclosure.",
        ],
        flow: "What Red-Flag does end-to-end",
        flowItems: [
          "1. Enforces verified onboarding (individual or company) before access.",
          "2. Collects fraud reports through a guided multi-step submission flow.",
          "3. Stores supporting documents privately in a protected evidence vault.",
          "4. Exposes non-sensitive registry search results to verified users only.",
          "5. Uses a request-and-pay workflow before any evidence review.",
          "6. Supports admin moderation to approve/reject report requests with audit context.",
        ],
        impact: "Impact and value",
        impactBody:
          "The platform is designed to cut fraud exposure, increase decision confidence, and formalize risk screening as a repeatable process. It is built for serious users who need stronger trust signals without violating privacy, legal, or compliance boundaries.",
      };

  return (
    <div className="min-h-dvh bg-transparent">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-slate-50">{copy.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
          {copy.intro}
        </p>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/55 p-6">
          <h2 className="text-xl font-semibold text-slate-100">{copy.why}</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
            {copy.whyItems.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/55 p-6">
          <h2 className="text-xl font-semibold text-slate-100">{copy.flow}</h2>
          <ol className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
            {copy.flowItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/55 p-6">
          <h2 className="text-xl font-semibold text-slate-100">{copy.impact}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            {copy.impactBody}
          </p>
        </section>
      </main>
    </div>
  );
}
