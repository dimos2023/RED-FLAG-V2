"use client";

import { useState, type FormEvent } from "react";
import { SiteHeader } from "@/components/site-header";
import { VerifiedGate } from "@/components/verified-gate";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { uploadFraudEvidence } from "@/lib/supabase/storage";

type ReportStep = 1 | 2 | 3;

export default function ReportPage() {
  const [step, setStep] = useState<ReportStep>(1);
  const [subjectName, setSubjectName] = useState<string>("");
  const [subjectPhone, setSubjectPhone] = useState<string>("");
  const [subjectCr, setSubjectCr] = useState<string>("");
  const [subjectAddress, setSubjectAddress] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [vaultSummary, setVaultSummary] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  function handleStep1(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStep(2);
  }

  function handleStep2(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStep(3);
  }

  async function handleStep3(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setVaultSummary("");
    const sb = createSupabaseBrowserClient();
    if (!sb) {
      setVaultSummary(
        "Supabase not configured: nothing was saved server-side.",
      );
      setSubmitting(false);
      setSubmitted(true);
      return;
    }
    const { data: authData, error: authErr } = await sb.auth.getUser();
    if (authErr || !authData.user) {
      setVaultSummary("You must be signed in to submit a report.");
      setSubmitting(false);
      setSubmitted(true);
      return;
    }
    const ownerId: string = authData.user.id;
    const { data: reportRow, error: insertErr } = await sb
      .from("reports")
      .insert({
        owner_id: ownerId,
        subject_name: subjectName,
        subject_phone: subjectPhone.trim() || null,
        subject_cr: subjectCr.trim() || null,
        subject_address: subjectAddress,
        review_status: "pending",
      })
      .select("id")
      .single();
    if (insertErr || !reportRow) {
      setVaultSummary(
        insertErr?.message ??
          "Could not create report row. Run the latest SQL migrations in Supabase.",
      );
      setSubmitting(false);
      setSubmitted(true);
      return;
    }
    const reportId: string = reportRow.id as string;
    const folder: string = `reports/${reportId}`;
    const messages: string[] = [`Report #${reportId.slice(0, 8)}… saved as pending review.`];
    if (logoFile) {
      const logoRes = await uploadFraudEvidence(sb, ownerId, {
        file: logoFile,
        reportFolder: folder,
      });
      if (logoRes.ok) {
        const { error: logoUpdErr } = await sb
          .from("reports")
          .update({ logo_storage_path: logoRes.path })
          .eq("id", reportId);
        if (logoUpdErr) {
          messages.push(`Logo uploaded but DB update failed: ${logoUpdErr.message}`);
        } else {
          messages.push("Logo stored privately.");
        }
      } else {
        messages.push(`Logo upload skipped: ${logoRes.message}`);
      }
    }
    let uploaded: number = 0;
    const uploadErrors: string[] = [];
    for (const file of evidenceFiles) {
      const res = await uploadFraudEvidence(sb, ownerId, {
        file,
        reportFolder: folder,
      });
      if (!res.ok) {
        uploadErrors.push(res.message);
        continue;
      }
      const { error: evErr } = await sb.from("evidence_objects").insert({
        report_id: reportId,
        owner_id: ownerId,
        storage_path: res.path,
        content_type: file.type || null,
      });
      if (evErr) {
        uploadErrors.push(evErr.message);
      } else {
        uploaded += 1;
      }
    }
    if (evidenceFiles.length > 0) {
      messages.push(
        `Evidence files registered: ${String(uploaded)}/${String(evidenceFiles.length)}.`,
      );
    } else {
      messages.push("No evidence files attached.");
    }
    if (uploadErrors.length > 0) {
      messages.push(`Errors: ${uploadErrors.join("; ")}`);
    }
    setVaultSummary(messages.join(" "));
    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <div className="min-h-dvh bg-transparent">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <VerifiedGate>
          <h1 className="text-2xl font-bold text-slate-50">
            Fraud report wizard
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Multi-step intake. Evidence files are for the private vault only and
            must never be shown on public surfaces.
          </p>
          <div className="mt-6 flex gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            <span className={step >= 1 ? "text-red-400" : ""}>1 Subject</span>
            <span>/</span>
            <span className={step >= 2 ? "text-red-400" : ""}>2 Media</span>
            <span>/</span>
            <span className={step >= 3 ? "text-red-400" : ""}>3 Vault</span>
          </div>
          {submitted ? (
            <div className="mt-8 rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-6 text-sm text-emerald-100/90">
              <p>
                Subject: {subjectName}. Optional logo: {logoFile?.name ?? "—"}.
                Evidence files selected: {evidenceFiles.length}.
              </p>
              {vaultSummary ? (
                <p className="mt-3 text-emerald-200/80">{vaultSummary}</p>
              ) : null}
            </div>
          ) : step === 1 ? (
            <form
              onSubmit={handleStep1}
              className="mt-8 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
            >
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Name / entity
                </label>
                <input
                  required
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Phone
                </label>
                <input
                  type="tel"
                  value={subjectPhone}
                  onChange={(e) => setSubjectPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Commercial registry
                </label>
                <input
                  value={subjectCr}
                  onChange={(e) => setSubjectCr(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Address / notes
                </label>
                <textarea
                  required
                  rows={3}
                  value={subjectAddress}
                  onChange={(e) => setSubjectAddress(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/30"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
              >
                Continue
              </button>
            </form>
          ) : step === 2 ? (
            <form
              onSubmit={handleStep2}
              className="mt-8 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
            >
              <p className="text-sm text-slate-400">
                Optional image or logo associated with the subject. This is
                metadata only; do not upload sensitive evidence here.
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-slate-200"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
                >
                  Continue
                </button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={handleStep3}
              className="mt-8 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
            >
              <p className="text-sm text-slate-400">
                Evidence vault: PDF and images. These files stay private; serve
                via signed URLs after successful payment workflows.
              </p>
              <input
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={(e) =>
                  setEvidenceFiles(Array.from(e.target.files ?? []))
                }
                className="w-full text-sm text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-slate-200"
              />
              {evidenceFiles.length > 0 ? (
                <ul className="text-xs text-slate-500">
                  {evidenceFiles.map((f) => (
                    <li key={f.name}>{f.name}</li>
                  ))}
                </ul>
              ) : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
                >
                  {submitting ? "Submitting…" : "Submit report"}
                </button>
              </div>
            </form>
          )}
        </VerifiedGate>
      </main>
    </div>
  );
}
