"use client";

import { SiteHeader } from "@/components/site-header";
import { useLanguage } from "@/contexts/language-context";

export default function PoliciesPage() {
  const { isArabic } = useLanguage();
  const copy = isArabic
    ? {
        title: "السياسات",
        intro:
          "توضح هذه السياسات كيفية تعامل Red-Flag مع الهوية والبلاغات والأدلة والمسؤولية القانونية وحوكمة الحسابات.",
        sections: [
          {
            title: "1) سياسة الوصول والتحقق",
            body: "ميزات البحث والإبلاغ تتطلب حسابًا موثقًا. الأفراد يكملون الهاتف والهوية، والشركات تكمل السجل التجاري والبريد الرسمي.",
          },
          {
            title: "2) سياسة مسؤولية المحتوى",
            body: "الرافع مسؤول بالكامل عن دقة وقانونية وملكية المحتوى المرفوع. Red-Flag توفر الاستضافة وسير العمل ولا تعتمد الحقيقة بشكل مستقل.",
          },
          {
            title: "3) سياسة خصوصية الأدلة",
            body: "الأدلة خاصة افتراضيًا ولا تظهر علنًا في البحث. الوصول إليها منضبط وقابل للتدقيق ويخضع للصلاحيات ومسار الدفع عند التفعيل.",
          },
          {
            title: "4) سياسة إساءة الاستخدام والتنفيذ",
            body: "البلاغات الكاذبة أو الانتحال أو المضايقة أو رفع ملفات ضارة قد يؤدي إلى الإيقاف الفوري والحظر الدائم والتصعيد القانوني.",
          },
          {
            title: "5) سياسة المراجعة الإدارية",
            body: "يمكن للمراجعين الإداريين تصنيف البلاغات إلى: قيد المراجعة أو مقبول أو مرفوض بناءً على السياسات وسياق الامتثال.",
          },
        ],
      }
    : {
        title: "Policies",
        intro:
          "These policies define how Red-Flag handles identity, reports, evidence, legal responsibility, and account governance across the platform.",
        sections: [
          {
            title: "1) Access & verification policy",
            body: "Search and reporting features require a verified account. Individuals complete phone and identity steps; companies complete commercial registry and official email checks.",
          },
          {
            title: "2) Content responsibility policy",
            body: "Uploaders are solely responsible for the accuracy, legality, and ownership rights of submitted reports and files. Red-Flag provides hosting workflows and does not independently certify factual truth.",
          },
          {
            title: "3) Evidence privacy policy",
            body: "Evidence documents are private by default and never publicly listed in search. Access is controlled, auditable, and limited by authorization and payment workflows when enabled.",
          },
          {
            title: "4) Abuse & enforcement policy",
            body: "False reporting, impersonation, harassment, malicious uploads, or policy circumvention may result in immediate suspension, permanent bans, and potential legal escalation under applicable law.",
          },
          {
            title: "5) Moderation policy",
            body: "Admin reviewers can mark reports as pending, approved, or rejected based on policy checks, supporting context, and compliance requirements.",
          },
        ],
      };

  return (
    <div className="min-h-dvh bg-transparent">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-slate-50">{copy.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
          {copy.intro}
        </p>

        <div className="mt-8 space-y-5">
          {copy.sections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-slate-800 bg-slate-900/55 p-6"
            >
              <h2 className="text-lg font-semibold text-slate-100">
                {section.title}
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
