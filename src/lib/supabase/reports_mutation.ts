import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_REPORT_INSERT_STRIPS: number = 12;

function removeReportsColumnMentionedInError(
  message: string,
  row: Record<string, unknown>,
): Record<string, unknown> | null {
  const match: RegExpMatchArray | null = message.match(
    /'([\w_]+)'\s+column\s+of\s+'reports'/i,
  );
  if (match === null) {
    return null;
  }
  const columnName: string = match[1];
  if (!(columnName in row)) {
    return null;
  }
  const next: Record<string, unknown> = { ...row };
  delete next[columnName];
  return next;
}

/** Map `subject_address` → legacy column name when the canonical column is missing. */
function remapSubjectAddressLegacyColumn(
  message: string,
  row: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!message.includes("subject_address") || !("subject_address" in row)) {
    return null;
  }
  const value: unknown = row.subject_address;
  const next: Record<string, unknown> = { ...row };
  delete next.subject_address;
  if (message.includes("'address'")) {
    next.address = value;
    return next;
  }
  if (message.includes("'subject_notes'")) {
    next.subject_notes = value;
    return next;
  }
  return null;
}

export type InsertReportInput = {
  ownerId: string;
  subjectName: string;
  subjectPhone: string | null;
  subjectCr: string | null;
  subjectAddress: string;
};

export async function insertPublicReportRow(
  supabase: SupabaseClient,
  input: InsertReportInput,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  let current: Record<string, unknown> = {
    owner_id: input.ownerId,
    subject_name: input.subjectName.trim(),
    subject_phone: input.subjectPhone,
    subject_cr: input.subjectCr,
    subject_address: input.subjectAddress.trim(),
    review_status: "pending",
  };
  for (let attempt = 0; attempt < MAX_REPORT_INSERT_STRIPS; attempt++) {
    try {
      const { data, error } = await supabase
        .schema("public")
        .from("reports")
        .insert(current)
        .select("id")
        .single();
      if (error === null && data?.id) {
        return { ok: true, id: String(data.id) };
      }
      if (error === null) {
        return { ok: false, message: "Report insert did not return an id." };
      }
      const legacy: Record<string, unknown> | null =
        remapSubjectAddressLegacyColumn(error.message, current);
      if (legacy !== null) {
        current = legacy;
        continue;
      }
      const stripped: Record<string, unknown> | null =
        removeReportsColumnMentionedInError(error.message, current);
      if (stripped === null) {
        return { ok: false, message: error.message };
      }
      current = stripped;
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : String(err);
      return { ok: false, message: msg };
    }
  }
  return {
    ok: false,
    message:
      "Could not save report. Apply Supabase migration 20260520120000_reports_subject_address_and_columns.sql.",
  };
}

export async function updateReportLogoPath(
  supabase: SupabaseClient,
  reportId: string,
  logoStoragePath: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase
    .schema("public")
    .from("reports")
    .update({ logo_storage_path: logoStoragePath })
    .eq("id", reportId);
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
