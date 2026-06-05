import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export async function GET(request: Request) {
  const env = getSupabasePublicEnv();
  const serviceKey: string = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!env || !serviceKey) {
    return NextResponse.json({ message: "Missing Supabase service role key." }, { status: 500 });
  }

  const url = new URL(request.url);
  const q = url.searchParams;
  const page = Number(q.get("page") ?? "1");
  const per_page = Number(q.get("per_page") ?? "20");
  const search = (q.get("search") ?? "").trim();
  const verification_status = (q.get("verification_status") ?? "").trim();
  const provider = (q.get("provider") ?? "").trim();

  const adminClient = createClient(env.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const start = Math.max(0, (page - 1) * per_page);
  const end = start + per_page - 1;

  let builder = adminClient
    .schema("public")
    .from("profiles")
    .select("id, full_name, email, phone, national_id_number, verification_status, created_at, google_identity_verified", { count: "exact" });

  if (search.length >= 2) {
    const ilike = `%${search}%`;
    builder = builder.or(`full_name.ilike.${ilike},email.ilike.${ilike}`);
  }
  if (verification_status) {
    builder = builder.eq("verification_status", verification_status);
  }
  if (provider === "google") {
    builder = builder.eq("google_identity_verified", true);
  } else if (provider === "email") {
    builder = builder.eq("google_identity_verified", false);
  }

  const { data, error, count } = await builder.order("created_at", { ascending: false }).range(start, end);
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [], total: count ?? 0 });
}

export async function PUT(request: Request) {
  const env = getSupabasePublicEnv();
  const serviceKey: string = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!env || !serviceKey) {
    return NextResponse.json({ message: "Missing Supabase service role key." }, { status: 500 });
  }
  const adminClient = createClient(env.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  type UpdateRequest = {
    id?: string;
    full_name?: string | null;
    phone?: string | null;
    national_id_number?: string | null;
    verification_status?: string | null;
  };
  const { id, full_name, phone, national_id_number, verification_status } = (body as UpdateRequest) ?? {};
  if (!id) {
    return NextResponse.json({ message: "Missing user id" }, { status: 400 });
  }

  const { data, error } = await adminClient
    .from("profiles")
    .update({ full_name, phone, national_id_number, verification_status })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
  return NextResponse.json({ user: data ?? null });
}

export async function DELETE(request: Request) {
  const env = getSupabasePublicEnv();
  const serviceKey: string = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!env || !serviceKey) {
    return NextResponse.json({ message: "Missing Supabase service role key." }, { status: 500 });
  }
  const adminClient = createClient(env.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  type DeleteRequest = { id?: string };
  const { id } = (body as DeleteRequest) ?? {};
  if (!id) {
    return NextResponse.json({ message: "Missing user id" }, { status: 400 });
  }

  // First attempt to remove auth user via Admin API
  try {
    // supabase-js v2 admin delete user
    // @ts-expect-error supabase-js exposes admin.deleteUser on the admin client in runtime; typing mismatch with bundled types
    if (adminClient.auth?.admin?.deleteUser) {
      // @ts-expect-error explained above: runtime admin API may exist even if types don't reflect it
      const { error: delErr } = await adminClient.auth.admin.deleteUser(id);
      if (delErr) {
        console.warn("auth.admin.deleteUser error", (delErr as Error).message);
      }
    }
  } catch (e) {
    console.warn("deleteUser call failed", e as Error);
  }

  // Remove profile row as well
  const { error } = await adminClient.from("profiles").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
