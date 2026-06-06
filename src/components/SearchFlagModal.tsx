"use client";

import { AnimatePresence, motion } from "framer-motion";
import React from "react";

export type PublicSearchMatchUI = {
  id: string;
  entityName: string;
  commercialRegistrationNumber: string | null;
  phoneNumber: string | null;
  logoImageUrl: string | null;
  summary: string;
  hasEvidence: boolean;
  createdAt?: string | null;
  evidenceFeeCents: number;
};

type Props = {
  open: boolean;
  flag: "green" | "red" | "idle";
  results: PublicSearchMatchUI[];
  isArabic: boolean;
  onClose: () => void;
};

export default function SearchFlagModal({ open, flag, results, isArabic, onClose }: Props) {
  const greenText = isArabic
    ? {
        title: "مؤشر آمن (Green-Flag)",
        body:
          "لم يتم العثور على أي بلاغات أو سجلات سلبية مرتبطة بالبيانات المدخلة في نظامنا حتى الآن.",
        close: "إغلاق",
      }
    : {
        title: "Safe Indicator (Green-Flag)",
        body: "No negative records or fraud reports associated with this data were found in our system.",
        close: "Close",
      };

  const redText = isArabic
    ? {
        title: "تحذير أمني (Red-Flag)",
        body:
          "تم العثور على سجلات أو بلاغات احتيال معتمدة مرتبطة بهذه البيانات! يرجى توخي الحذر الشديد.",
        close: "إغلاق",
      }
    : {
        title: "Security Alert (Red-Flag)",
        body:
          "Verified reports or fraud records associated with this data have been found! Please proceed with extreme caution.",
        close: "Close",
      };

  return (
    <AnimatePresence>
      {open && flag === "green" && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="w-full max-w-lg rounded-2xl border border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)] bg-slate-900/80 p-4 sm:p-8"
          >
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600/10 ring-2 ring-emerald-400 animate-[pulse_2s_infinite] sm:h-24 sm:w-24">
                <svg className="h-8 w-8 text-emerald-400 sm:h-12 sm:w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-bold text-emerald-300 sm:text-2xl">{greenText.title}</h3>
                <p className="mt-1 text-xs text-slate-200 sm:mt-2 sm:text-sm">{greenText.body}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-center sm:mt-6 sm:justify-end">
              <button
                onClick={() => {
                  onClose();
                }}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 h-11 min-w-24"
              >
                {greenText.close}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {open && flag === "red" && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="w-full max-w-lg rounded-2xl border border-red-500 animate-pulse bg-slate-900/85 p-4 sm:p-8 overflow-y-auto max-h-[90vh]"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-6 sm:items-start">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-red-600/10 ring-2 ring-red-400 mx-auto sm:mx-0 sm:h-24 sm:w-24">
                <svg className="h-8 w-8 text-red-400 sm:h-12 sm:w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 12A9 9 0 1112 3a9 9 0 019 9z" />
                </svg>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg font-bold text-red-300 sm:text-2xl">{redText.title}</h3>
                <p className="mt-1 text-xs text-slate-200 sm:mt-2 sm:text-sm">{redText.body}</p>

                <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
                  {results.slice(0, 5).map((r) => (
                    <div key={r.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-2 sm:p-3">
                      <p className="text-xs font-semibold text-slate-100 sm:text-sm break-words">{r.entityName}</p>
                      <p className="mt-0.5 text-xs text-slate-400 break-words sm:mt-1">{r.summary}</p>
                      <p className="mt-0.5 text-xs text-amber-200/90 sm:mt-1">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"} · {r.hasEvidence ? "Evidence" : "No evidence"}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:justify-between">
              <button
                onClick={() => {
                  onClose();
                }}
                className="rounded-lg border border-slate-700 bg-transparent px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 h-11 order-2 sm:order-1"
              >
                {redText.close}
              </button>
              <button
                onClick={() => {
                  onClose();
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 h-11 order-1 sm:order-2"
              >
                {isArabic ? "عرض التفاصيل" : "View details"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
