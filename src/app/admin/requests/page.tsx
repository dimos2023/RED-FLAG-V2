"use client";

/*
Cursor Prompt:

"يا كيرسل، لوحة الأدمن تظهر خطأ `column reports.name does not exist` والجدول فارغ كما في الصورة `image_01b9e2.jpg`. بالإضافة إلى أننا نريد تفعيل الفلاتر (Tabs) بشكل كامل لفصل البلاغات.**المطلوب تنفيذه بدقة فوراً:**
1. إصلاح جلب البيانات واستبدال العمود القديم: ابحث في استعلام الـ Supabase (سواء في الـ API Route الخاص بالأدمن أو داخل الكومبوننت) واستبدل أي محاولة لقراءة `row.name` أو `reports.name` بالعمود الجديد الصحيح: `subject_name`. في الجدول (Table Rows)، اجعل خانة الـ SUBJECT تعرض `row.subject_name` وعنوان البلاغ `row.title` لتظهر البيانات التي حقناها في الـ Script بنجاح.
2. تفعيل أزرار التصفية الفوقية (Pending / Approved / Rejected / All): اربط الأزرار الأربعة بحالة نشطة (`useState` باسم `activeTab`). قم بعمل فلترة للمصفوفة القادمة من الداتابيز (`reports`) بناءً على الزر النشط كما هو مطلوب.
3. إضافة أزرار التحكم للأدمن (Actions): في خانة الـ ACTION في الـ `Pending view`، تأكد من وجود زرين تفاعليين: زر Approve لتحديث `review_status` إلى `'approved'`، وزر Reject لتحديثها إلى `'rejected'`.
4. الأمان واستقرار الـ Types: تأكد من استخدام "use client" لوجود الـ State والتفاعلات، واستخدم الأنواع الصارمة لبيانات الـ `Report` لتجنب فشل الـ Build.
"
*/

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { FraudReportRow, ReportReviewStatus } from "@/types";

type AdminReportRow = FraudReportRow & {
  title?: string | null;
};

type FilterStatus = "all" | ReportReviewStatus;

export default function AdminRequestsPage() {
  const supabase = createSupabaseBrowserClient();
  const [activeTab, setActiveTab] = useState<FilterStatus>("pending");
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
    const query = supabase
      .schema("public")
      .from("reports")
      .select(
        "id, owner_id, subject_name, subject_phone, subject_cr, subject_address, review_status, reviewed_by, reviewed_at, admin_note, logo_storage_path, created_at, title",
      )
      .order("created_at", { ascending: false });
    const { data, error: qErr } = await query;
    setLoading(false);
    if (qErr) {
      setError(qErr.message);
      setRows([]);
      return;
    }
    setRows((data ?? []) as AdminReportRow[]);
  }, [supabase]);

  // client-side filtered view based on activeTab
  const filteredReports = rows.filter((r) => {
    if (activeTab === "all") return true;
    return r.review_status === activeTab;
  });

  async function updateReportStatus(id: string, status: ReportReviewStatus) {
    if (!supabase) return;
    setActionPending(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setActionPending(false);
      return;
    }
    const { error } = await supabase
      .schema("public")
      .from("reports")
      .update({ review_status: status, reviewed_by: authData.user.id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    setActionPending(false);
    if (error) {
      setError(error.message);
      return;
    }
    // update local state for immediate UI feedback
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, review_status: status } : r)));
  }

  useEffect(() => {
    // 1. شرط الحماية لمنع خطأ 'possibly null'
    if (!supabase) return;

    const fetchReports = async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setRows(data as AdminReportRow[]);
      }
    };

    fetchReports();

    // Realtime subscription
    const channel = supabase
      .channel("public:reports")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        (payload) => {
          // تعامل مع التحديثات اللحظية هنا لإبقاء اللوحة حية
          fetchReports(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // 2. إضافة supabase هنا لحل تحذير الـ Linting
  }, [supabase]);

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
          {([
            ["pending", "Pending"],
            ["approved", "Approved"],
            ["rejected", "Rejected"],
            ["all", "All"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setActiveTab(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                activeTab === value
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
            {filteredReports.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-8 text-center text-sm text-slate-500">
                No reports in this view.
              </div>
            ) : (
              filteredReports.map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-200">{r.subject_name ?? r.title ?? "Unnamed entity"}</p>
                      <p className="mt-1 text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.review_status === "pending"
                        ? "bg-amber-950/80 text-amber-200"
                        : r.review_status === "approved"
                          ? "bg-emerald-950/80 text-emerald-200"
                          : "bg-red-950/80 text-red-200"
                    }`}>{r.review_status}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-slate-500">{r.subject_address}</p>
                  <p className="mt-1 font-mono text-xs text-slate-600">…{r.owner_id ? r.owner_id.slice(-8) : "—"}</p>
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
              {filteredReports.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No reports in this view.
                  </td>
                </tr>
              ) : (
                filteredReports.map((r) => (
                  <tr key={r.id} className="bg-slate-950/40 hover:bg-slate-900/40">
                    <td className="px-4 py-3 font-medium text-slate-200">
                      {r.subject_name ?? r.title ?? "Unnamed entity"}
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
                      …{r.owner_id ? r.owner_id.slice(-8) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.review_status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void updateReportStatus(r.id, "rejected")}
                            disabled={actionPending}
                            className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-950/70 disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => void updateReportStatus(r.id, "approved")}
                            disabled={actionPending}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                          >
                            Approve
                          </button>
                        </div>
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
            <p className="mt-2 text-sm text-slate-400">{selected.subject_name ?? selected.title ?? "Unnamed entity"}</p>
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
