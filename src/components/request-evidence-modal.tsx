"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export type EvidenceRequestHit = {
  id: string;
  displayName: string;
  hasEvidence: boolean;
  evidenceFeeCents: number;
};

type RequestEvidenceModalProps = {
  hit: EvidenceRequestHit | null;
  open: boolean;
  onClose: () => void;
};

export function RequestEvidenceModal({
  hit,
  open,
  onClose,
}: RequestEvidenceModalProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!open) {
      setStatus("idle");
      setMessage("");
    }
  }, [open]);

  async function handlePay() {
    if (!hit) {
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/checkout-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: hit.id }),
      });
      const data: { ok: boolean; checkoutUrl?: string; note?: string } =
        await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setStatus("done");
      setMessage(
        data.note ??
          "Payment session placeholder. Connect Stripe Checkout in production.",
      );
    } catch {
      setStatus("done");
      setMessage("Network error. Try again.");
    }
  }

  if (!hit) {
    return null;
  }

  const fee: string = (hit.evidenceFeeCents / 100).toFixed(2);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="evidence-title"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
          >
            <h2
              id="evidence-title"
              className="text-lg font-semibold text-slate-50"
            >
              Request evidence access
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {hit.displayName} — private vault contents are never shown in
              search. Pay the disclosure fee to start a secure review workflow.
            </p>
            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/80 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Fee due
              </p>
              <p className="text-2xl font-bold text-red-400">
                ${fee}{" "}
                <span className="text-sm font-normal text-slate-500">USD</span>
              </p>
            </div>
            {message ? (
              <p className="mt-4 text-sm text-amber-200/90">{message}</p>
            ) : null}
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={status === "loading" || !hit.hasEvidence}
                onClick={() => void handlePay()}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "loading"
                  ? "Processing…"
                  : hit.hasEvidence
                    ? "Pay & unlock"
                    : "No evidence on file"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
