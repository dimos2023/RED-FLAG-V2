"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

type UserRow = {
  id: string;
  full_name?: string | null;
  email: string;
  phone?: string | null;
  national_id_number?: string | null;
  verification_status?: string | null;
  created_at?: string | null;
  google_identity_verified?: boolean | null;
};

export function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const perPage = 20;
  const [search, setSearch] = useState<string>("");
  const [verificationFilter, setVerificationFilter] = useState<string>("");
  const [providerFilter, setProviderFilter] = useState<string>("");
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(perPage));
    if (search.trim().length >= 2) params.set("search", search.trim());
    if (verificationFilter) params.set("verification_status", verificationFilter);
    if (providerFilter) params.set("provider", providerFilter);
    const res = await fetch(`/api/admin/users?${params.toString()}`);
    if (!res.ok) return;
    const data = await res.json();
    setUsers(data.users ?? []);
    setTotal(data.total ?? 0);
  }, [page, perPage, search, verificationFilter, providerFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSearchSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setPage(1);
    void load();
  }

  function openEdit(u: UserRow) {
    setEditing(u);
  }

  function closeEdit() {
    setEditing(null);
  }

  async function saveEdit(updated: Partial<UserRow> & { id: string }) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/users`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        closeEdit();
        void load();
      } else {
        // rudimentary error handling
        alert("Unable to save user");
      }
    });
  }

  async function deleteUser(id: string) {
    if (!confirm("Confirm delete user — this action is permanent.")) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/users`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        void load();
      } else {
        alert("Unable to delete user");
      }
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h2 className="text-lg font-semibold text-slate-50">Users Management</h2>
      <form className="mt-4 flex gap-2" onSubmit={handleSearchSubmit}>
        <input
          aria-label="Search users"
          placeholder="Search name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
        />
        <select
          value={verificationFilter}
          onChange={(e) => setVerificationFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-2 text-sm text-slate-200"
        >
          <option value="">All verification</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-2 text-sm text-slate-200"
        >
          <option value="">All providers</option>
          <option value="google">Google OAuth</option>
          <option value="email">Email</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Search
        </button>
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full table-fixed text-left text-sm">
          <thead>
            <tr className="text-slate-400">
              <th className="w-1/4">Full name</th>
              <th className="w-1/4">Email</th>
              <th className="w-1/6">Phone</th>
              <th className="w-1/6">National ID</th>
              <th className="w-1/12">Status</th>
              <th className="w-1/12">Joined</th>
              <th className="w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t border-slate-800">
                  <td className="py-3 text-slate-100">{u.full_name ?? "—"}</td>
                  <td className="py-3 text-slate-200">{u.email}</td>
                  <td className="py-3 text-slate-200">{u.phone ?? "—"}</td>
                  <td className="py-3 text-slate-200">{u.national_id_number ?? "—"}</td>
                  <td className="py-3 text-slate-200">{u.verification_status ?? "pending"}</td>
                  <td className="py-3 text-slate-200">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(u)} className="rounded border border-slate-700 px-2 py-1 text-sm text-slate-200">Edit</button>
                      <button onClick={() => void deleteUser(u.id)} className="rounded bg-rose-600 px-2 py-1 text-sm font-semibold text-white">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-slate-400">Page {page} of {totalPages}</div>
        <div className="flex gap-2">
          <button disabled={page <= 1 || isPending} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded border border-slate-700 px-3 py-1 text-sm text-slate-200">Prev</button>
          <button disabled={page >= totalPages || isPending} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded border border-slate-700 px-3 py-1 text-sm text-slate-200">Next</button>
        </div>
      </div>

      {/* Edit modal */}
      {editing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-50">Edit user</h3>
            <div className="mt-4 space-y-3">
              <label className="block text-sm text-slate-300">Full name</label>
              <input defaultValue={editing.full_name ?? ""} id="edit-name" className="w-full rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200" />
              <label className="block text-sm text-slate-300">Phone</label>
              <input defaultValue={editing.phone ?? ""} id="edit-phone" className="w-full rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200" />
              <label className="block text-sm text-slate-300">National ID</label>
              <input defaultValue={editing.national_id_number ?? ""} id="edit-national" className="w-full rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200" />
              <label className="block text-sm text-slate-300">Verification status</label>
              <select defaultValue={editing.verification_status ?? "pending"} id="edit-status" className="w-full rounded border border-slate-700 bg-slate-950/60 px-2 py-2 text-sm text-slate-200">
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={closeEdit} className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm text-slate-300">Cancel</button>
              <button onClick={async () => {
                const name = (document.getElementById('edit-name') as HTMLInputElement).value;
                const phone = (document.getElementById('edit-phone') as HTMLInputElement).value;
                const national = (document.getElementById('edit-national') as HTMLInputElement).value;
                const status = (document.getElementById('edit-status') as HTMLSelectElement).value;
                await saveEdit({ id: editing.id, full_name: name, phone, national_id_number: national, verification_status: status });
              }} className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white">{isPending ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AdminUsers;
