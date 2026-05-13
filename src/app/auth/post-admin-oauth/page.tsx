"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/contexts/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isAdminOAuthIdentityAllowed } from "@/lib/admin_oauth_gate";

export default function PostAdminOAuthPage() {
  const router = useRouter();
  const { supabaseUser, isHydrated, refreshSessionFromSupabase } = useAuth();
  const [status, setStatus] = useState<string>(
    "جاري التحقق من صلاحيات الإدارة…",
  );
  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    if (!supabaseUser) {
      setStatus("جاري تحميل الجلسة…");
      return;
    }
    let cancelled: boolean = false;
    void (async (): Promise<void> => {
      const sb = createSupabaseBrowserClient();
      if (!sb) {
        if (!cancelled) {
          await refreshSessionFromSupabase();
          router.replace("/admin-login?reason=config");
        }
        return;
      }
      await refreshSessionFromSupabase();
      if (cancelled) {
        return;
      }
      const { data, error } = await sb.auth.getUser();
      const user = data.user;
      if (error || !user) {
        if (!cancelled) {
          router.replace("/admin-login?reason=session");
        }
        return;
      }
      if (!isAdminOAuthIdentityAllowed(user.id, user.email)) {
        await sb.auth.signOut();
        await refreshSessionFromSupabase();
        if (!cancelled) {
          router.replace("/admin-login?reason=forbidden");
        }
        return;
      }
      const { data: adminRow, error: adminErr } = await sb
        .from("app_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (adminErr || !adminRow) {
        await sb.auth.signOut();
        await refreshSessionFromSupabase();
        if (!cancelled) {
          router.replace("/admin-login?reason=forbidden");
        }
        return;
      }
      if (!cancelled) {
        router.replace("/admin/requests");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isHydrated, supabaseUser, router, refreshSessionFromSupabase]);
  return (
    <div className="min-h-dvh bg-transparent">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col items-center px-4 py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-red-500" />
        <p className="mt-6 text-center text-sm text-slate-400">{status}</p>
      </main>
    </div>
  );
}
