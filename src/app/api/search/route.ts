import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

type SearchRequestBody = {
  query?: string;
};

type PublicSearchMatch = {
  id: string;
  entityName: string;
  commercialRegistrationNumber: string | null;
  phoneNumber: string | null;
  logoImageUrl: string | null;
  summary: string;
  hasEvidence: boolean;
  evidenceFeeCents: number;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { message: "Supabase is not configured." },
      { status: 500 },
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      {
        message: "Mandatory registration required to search or access data.",
      },
      { status: 401 },
    );
  }

  let body: SearchRequestBody;
  try {
    body = (await request.json()) as SearchRequestBody;
  } catch {
    return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
  }

  const query: string = body.query?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json(
      { message: "Query must contain at least 2 characters." },
      { status: 400 },
    );
  }

  const env = getSupabasePublicEnv();
  const serviceKey: string = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!env || !serviceKey) {
    return NextResponse.json(
      {
        message:
          "Server search is unavailable: missing SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 },
    );
  }

  const adminClient = createClient(env.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const orFilter = [
    `subject_name.ilike.%${query}%`,
    `subject_cr.ilike.%${query}%`,
    `subject_phone.ilike.%${query}%`,
    `logo_storage_path.ilike.%${query}%`,
  ].join(",");

  const { data: reportRows, error: reportsError } = await adminClient
    .from("reports")
    .select(
      "id, subject_name, subject_cr, subject_phone, logo_storage_path, subject_address, review_status",
    )
    .eq("review_status", "approved")
    .or(orFilter)
    .order("created_at", { ascending: false })
    .limit(20);

  if (reportsError) {
    return NextResponse.json({ message: reportsError.message }, { status: 500 });
  }

  if (!reportRows || reportRows.length === 0) {
    return NextResponse.json({
      flag: "green",
      message:
        "No public records or reports found for this entity at this time.",
      results: [] as PublicSearchMatch[],
    });
  }

  const reportIds: string[] = reportRows.map((row) => row.id as string);
  const { data: evidenceRows, error: evidenceError } = await adminClient
    .from("evidence_objects")
    .select("report_id")
    .in("report_id", reportIds);
  if (evidenceError) {
    return NextResponse.json({ message: evidenceError.message }, { status: 500 });
  }

  const evidenceSet = new Set<string>(
    (evidenceRows ?? [])
      .map((row) => row.report_id as string | null)
      .filter((value): value is string => Boolean(value)),
  );

  const results: PublicSearchMatch[] = reportRows.map((row) => {
    const reportId: string = row.id as string;
    const entityName: string =
      (row.subject_name as string | null)?.trim() || "Unnamed entity";
    const commercialRegistrationNumber: string | null =
      (row.subject_cr as string | null) ?? null;
    const phoneNumber: string | null = (row.subject_phone as string | null) ?? null;
    const logoImageUrl: string | null =
      (row.logo_storage_path as string | null) ?? null;
    const locationSummary: string =
      (row.subject_address as string | null)?.trim() || "Address not provided";

    return {
      id: reportId,
      entityName,
      commercialRegistrationNumber,
      phoneNumber,
      logoImageUrl,
      summary: locationSummary,
      hasEvidence: evidenceSet.has(reportId),
      evidenceFeeCents: 4900,
    };
  });

  return NextResponse.json({
    flag: "red",
    message: `${results.length} matching record(s) found.`,
    results,
  });
}

