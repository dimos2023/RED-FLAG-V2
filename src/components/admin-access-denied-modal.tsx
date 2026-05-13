"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ADMIN_OAUTH_FORBIDDEN_MESSAGE_AR } from "@/lib/admin_oauth_gate";

type AdminAccessDeniedModalProps = {
  open: boolean;
  isArabic: boolean;
  onClose: () => void;
};

export function AdminAccessDeniedModal({
  open,
  isArabic,
  onClose,
}: AdminAccessDeniedModalProps) {
  const copy = isArabic
    ? {
        title: "تنبيه — لوحة الإدارة",
        body: `${ADMIN_OAUTH_FORBIDDEN_MESSAGE_AR} إذا حاولت مرة أخرى الدخول إلى الإدارة بحساب غير مصرح به، سيتم حظر بريدك الإلكتروني نهائياً ولن تتمكن من استخدام الموقع بعد ذلك.`,
        button: "فهمت",
      }
    : {
        title: "No admin access",
        body:
          "This account is not authorized for the admin panel. If you try to access admin again with an unauthorized account, your email will be permanently blocked from using this site.",
        button: "Understood",
      };
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-denied-title"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
          >
            <h2
              id="admin-denied-title"
              className="text-lg font-semibold text-slate-50"
            >
              {copy.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              {copy.body}
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
              >
                {copy.button}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
