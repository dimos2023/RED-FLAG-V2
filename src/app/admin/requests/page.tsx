"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { FraudReportRow, ReportReviewStatus } from "@/types";

type AdminReportRow = FraudReportRow & {
  name?: string | null;
};

type FilterStatus = "all" | ReportReviewStatus;

export default function AdminRequestsPage() {
  const supabase = createSupabaseBrowserClient();
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [rows, setRows] = useState<AdminReportRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [selected, setSelected] = useState<AdminReportRow | null>(null);
  const [note, setNote] = useState<string>("");
  const [actionPending, setActionPending] = useState<boolean>(false);

  const loadReports = useCallback(async () => {
    if (!supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    let query = supabase
      .schema("public")
      .from("reports")
      .select(
        "id, owner_id, subject_name, name, subject_phone, subject_cr, subject_address, review_status, reviewed_by, reviewed_at, admin_note, logo_storage_path, created_at",
      )
      .order("created_at", { ascending: false });
    if (filter !== "all") {
      query = query.eq("review_status", filter);
    }
    const { data, error: qErr } = await query;
    setLoading(false);
    if (qErr) {
      setError(qErr.message);
      setRows([]);
      return;
    }
    setRows((data ?? []) as AdminReportRow[]);
  }, [supabase, filter]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  async function executeReview(next: ReportReviewStatus) {
    if (!supabase || !selected) {
      return;
    }
    setActionPending(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setActionPending(false);
      return;
    }
    const { error: uErr } = await supabase
      .schema("public")
      .from("reports")
      .update({
        review_status: next,
        reviewed_by: authData.user.id,
        reviewed_at: new Date().toISOString(),
        admin_note: note.trim() || null,
      })
      .eq("id", selected.id);
    setActionPending(false);
    if (uErr) {
      setError(uErr.message);
      return;
    }
    setSelected(null);
    setNote("");
    void loadReports();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-50">Fraud report queue</h2>
          <p className="mt-1 text-sm text-slate-400">
            Approve or reject submissions. Evidence stays in private storage.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["pending", "Pending"],
              ["approved", "Approved"],
              ["rejected", "Rejected"],
              ["all", "All"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                filter === value
                  ? "bg-red-600 text-white"
                  : "border border-slate-700 text-slate-400 hover:bg-slate-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <p className="mt-6 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <div className="mt-10 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-red-500" />
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-3 md:hidden">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-8 text-center text-sm text-slate-500">
                No reports in this view.
              </div>
            ) : (
              rows.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-200">
                        {r.subject_name ?? r.name ?? "Unnamed entity"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(r.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.review_status === "pending"
                          ? "bg-amber-950/80 text-amber-200"
                          : r.review_status === "approved"
                            ? "bg-emerald-950/80 text-emerald-200"
                            : "bg-red-950/80 text-red-200"
                      }`}
                    >
                      {r.review_status}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                    {r.subject_address}
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-600">
                    …{r.owner_id.slice(-8)}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(r);
                      setNote(r.admin_note ?? "");
                    }}
                    className="mt-3 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 ring-1 ring-slate-700 hover:bg-slate-700"
                  >
                    {r.review_status === "pending" ? "Review" : "View note"}
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="mt-8 hidden overflow-x-auto rounded-xl border border-slate-800 md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No reports in this view.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="bg-slate-950/40 hover:bg-slate-900/40">
                    <td className="px-4 py-3 font-medium text-slate-200">
                      {r.subject_name ?? r.name ?? "Unnamed entity"}
                      <p className="mt-0.5 line-clamp-2 text-xs font-normal text-slate-500">
                        {r.subject_address}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.review_status === "pending"
                            ? "bg-amber-950/80 text-amber-200"
                            : r.review_status === "approved"
                              ? "bg-emerald-950/80 text-emerald-200"
                              : "bg-red-950/80 text-red-200"
                        }`}
                      >
                        {r.review_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      …{r.owner_id.slice(-8)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.review_status === "pending" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(r);
                            setNote(r.admin_note ?? "");
                          }}
                          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-slate-700 hover:bg-slate-700"
                        >
                          Review
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(r);
                            setNote(r.admin_note ?? "");
                          }}
                          className="text-xs text-slate-500 hover:text-slate-300"
                        >
                          View note
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </>
      )}
      {selected ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-title"
          onClick={() => {
            setSelected(null);
            setNote("");
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="review-title"
              className="text-lg font-semibold text-slate-50"
            >
              {selected.review_status === "pending"
                ? "Decision"
                : "Report details"}
            </h3>
            <p className="mt-2 text-sm text-slate-400">{selected.subject_name ?? selected.name ?? "Unnamed entity"}</p>
            <dl className="mt-4 space-y-1 text-xs text-slate-500">
              <div>
                <dt className="inline text-slate-600">Phone: </dt>
                <dd className="inline text-slate-400">
                  {selected.subject_phone ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="inline text-slate-600">CR: </dt>
                <dd className="inline text-slate-400">
                  {selected.subject_cr ?? "—"}
                </dd>
              </div>
            </dl>
            <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Admin note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
            />
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setNote("");
                }}
                className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
              >
                Close
              </button>
              {selected.review_status === "pending" ? (
                <>
                  <button
                    type="button"
                    disabled={actionPending}
                    onClick={() => void executeReview("rejected")}
                    className="flex-1 rounded-lg border border-red-900/60 bg-red-950/40 py-2.5 text-sm font-medium text-red-200 hover:bg-red-950/70 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={actionPending}
                    onClick={() => void executeReview("approved")}
                    className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Approve
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
