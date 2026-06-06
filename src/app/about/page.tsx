"use client";

import { motion } from "framer-motion";
import { useState, useRef } from "react";
import { SiteHeader } from "@/components/site-header";
import { useLanguage } from "@/contexts/language-context";


type CardSection = {
  title: string;
  description: string;
  icon: string;
};

function GlassmorphicCard({
  section,
  index,
  isArabic,
}: {
  section: CardSection;
  index: number;
  isArabic: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const x = ((e.clientX - rect.left - centerX) / centerX) * 15;
    const y = ((e.clientY - rect.top - centerY) / centerY) * -15;

    setRotateX(y);
    setRotateY(x);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: "1000px",
        transformStyle: "preserve-3d",
        transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transition: "transform 0.1s ease-out",
      }}
      className="h-full"
    >
      <div className="relative h-full rounded-2xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-md p-8 shadow-2xl overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-600/10 via-transparent to-slate-950/30 pointer-events-none" />

        <div className="relative z-10">
          <div className="text-4xl mb-4">{section.icon}</div>
          <h3 className={`text-xl font-bold text-slate-50 mb-4 ${isArabic ? "text-right" : ""}`}>
            {section.title}
          </h3>
          <p className={`text-sm leading-relaxed text-slate-300 ${isArabic ? "text-right" : ""}`}>
            {section.description}
          </p>
        </div>

        <div className="absolute inset-0 rounded-2xl border border-slate-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>
    </motion.div>
  );
}

export default function AboutPage() {
  const { isArabic } = useLanguage();

  const copy = isArabic
    ? {
        title: "من نحن - منصة Red-Flag",
        subtitle:
          "منظومة تقنية أمنية متكاملة تهدف إلى مكافحة الاحتيال الرقمي، وتوثيق البلاغات، وحماية الهوية الرقمية للشركات والأفراد عبر بيئة رقمية مشفرة وشفافة.",
        visionTitle: "رؤيتنا",
        visionDesc:
          "ريادة الفضاء الرقمي في مكافحة الجرائم الإلكترونية وتوفير بيئة تصفح ومعاملات آمنة وخالية من التهديدات في الشرق الأوسط.",
        visionIcon: "🌍",
        missionTitle: "رسالتنا",
        missionDesc:
          "تمكين الأفراد والشركات من الإبلاغ عن الأنشطة المشبوهة والتحقق من الهويات التجارية فوراً، مستعينين بأحدث تقنيات الذكاء الاصطناعي والأدلة الرقمية المعززة.",
        missionIcon: "🎯",
        valuesTitle: "قيمنا الأساسية",
        valuesDesc:
          "الشفافية والأمان والابتكار والمسؤولية الاجتماعية في بناء منصة موثوقة تحافظ على سلامة البيئة الرقمية والتجارية.",
        valuesIcon: "⚡",
      }
    : {
        title: "About Red-Flag",
        subtitle:
          "An integrated security technology system designed to combat digital fraud, document reports, and protect the digital identity of companies and individuals through a secure, transparent digital environment.",
        visionTitle: "Our Vision",
        visionDesc:
          "Lead the digital space in combating cyber crimes and providing a safe, threat-free browsing and transaction environment in the Middle East.",
        visionIcon: "🌍",
        missionTitle: "Our Mission",
        missionDesc:
          "Empower individuals and companies to report suspicious activities and verify commercial identities instantly, leveraging cutting-edge AI and enhanced digital evidence.",
        missionIcon: "🎯",
        valuesTitle: "Core Values",
        valuesDesc:
          "Transparency, security, innovation, and social responsibility in building a trusted platform that preserves the integrity of digital and commercial environments.",
        valuesIcon: "⚡",
      };

  const sections: CardSection[] = [
    {
      title: copy.visionTitle,
      description: copy.visionDesc,
      icon: copy.visionIcon,
    },
    {
      title: copy.missionTitle,
      description: copy.missionDesc,
      icon: copy.missionIcon,
    },
    {
      title: copy.valuesTitle,
      description: copy.valuesDesc,
      icon: copy.valuesIcon,
    },
  ];

  return (
    <div
      className="min-h-dvh bg-transparent"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <SiteHeader />
      <main className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className={`mb-16 ${isArabic ? "text-right" : "text-left"}`}
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-50 mb-4">
            {copy.title}
          </h1>
          <p className="text-lg text-slate-300 max-w-3xl leading-relaxed">
            {copy.subtitle}
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3 mb-20">
          {sections.map((section, idx) => (
            <GlassmorphicCard
              key={idx}
              section={section}
              index={idx}
              isArabic={isArabic}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
