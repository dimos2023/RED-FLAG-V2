"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/contexts/auth-context";
import { isAdminOAuthEmailAllowed } from "@/lib/admin_oauth_gate";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type RpcStrikePayload = {
  strike_count?: unknown;
  permanently_blocked?: unknown;
};

function readStrikeRpcPayload(raw: unknown): {
  strikeCount: number;
  permanentlyBlocked: boolean;
} {
  if (raw === null || typeof raw !== "object") {
    return { strikeCount: 0, permanentlyBlocked: false };
  }
  const o: RpcStrikePayload = raw as RpcStrikePayload;
  const strikeRaw: unknown = o.strike_count;
  const strikeCount: number =
    typeof strikeRaw === "number" && Number.isFinite(strikeRaw)
      ? strikeRaw
      : 0;
  return {
    strikeCount,
    permanentlyBlocked: Boolean(o.permanently_blocked),
  };
}

export default function PostAdminOAuthPage() {
  const router = useRouter();
  const { isHydrated, refreshSessionFromSupabase } = useAuth();
  const [status, setStatus] = useState<string>(
    "جاري التحقق من صلاحيات الإدارة…",
  );
  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    let cancelled: boolean = false;
    void (async (): Promise<void> => {
      setStatus("جاري تحميل الجلسة…");
      await refreshSessionFromSupabase();
      if (cancelled) {
        return;
      }
      const sb = createSupabaseBrowserClient();
      if (!sb) {
        if (!cancelled) {
          router.replace("/admin-login?reason=config");
        }
        return;
      }
      if (cancelled) {
        return;
      }
      setStatus("جاري التحقق من صلاحيات الإدارة…");
      const { data, error } = await sb.auth.getUser();
      const user = data.user;
      if (error || !user) {
        if (!cancelled) {
          router.replace("/admin-login?reason=session");
        }
        return;
      }
      if (!isAdminOAuthEmailAllowed(user.email)) {
        const { data: rpcRaw } = await sb.rpc("record_admin_unauthorized_attempt");
        const { permanentlyBlocked } = readStrikeRpcPayload(rpcRaw);
        await sb.auth.signOut();
        await refreshSessionFromSupabase();
        if (cancelled) {
          return;
        }
        if (permanentlyBlocked) {
          window.location.assign("/site-blocked?reason=admin_permanent");
          return;
        }
        router.replace("/admin-login?reason=forbidden");
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
          router.replace("/admin-login?reason=no_admin_role");
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
  }, [isHydrated, router, refreshSessionFromSupabase]);
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
