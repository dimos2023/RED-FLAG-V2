import type { SupabaseClient } from "@supabase/supabase-js";

/** Must match `supabase/migrations/*_fraud_evidence_bucket.sql` */
export const FRAUD_EVIDENCE_BUCKET_ID = "fraud-evidence";

const ALLOWED_MIME = new Set<string>([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function sanitizeFileName(fileName: string): string {
  const base: string = fileName.replace(/[/\\]/g, "_").trim() || "document";
  return base.slice(0, 180);
}

function sanitizeReportFolder(folder: string): string {
  return folder
    .split(/[/\\]+/)
    .filter((segment: string) => {
      const s: string = segment.trim();
      return s.length > 0 && s !== "." && s !== "..";
    })
    .join("/");
}

export type UploadEvidenceInput = {
  file: File;
  /** Optional subfolder under the user prefix, e.g. report UUID */
  reportFolder?: string;
};

export type UploadEvidenceResult =
  | { ok: true; path: string }
  | { ok: false; message: string };

export async function uploadFraudEvidence(
  supabase: SupabaseClient,
  userId: string,
  input: UploadEvidenceInput,
): Promise<UploadEvidenceResult> {
  if (!ALLOWED_MIME.has(input.file.type)) {
    return {
      ok: false,
      message: "Only PDF and common image types are allowed.",
    };
  }
  const sub: string | null = input.reportFolder
    ? sanitizeReportFolder(input.reportFolder)
    : null;
  const folder: string =
    sub && sub.length > 0 ? `${userId}/${sub}` : userId;
  const objectName: string = `${crypto.randomUUID()}_${sanitizeFileName(input.file.name)}`;
  const path: string = `${folder}/${objectName}`;
  const { error } = await supabase.storage
    .from(FRAUD_EVIDENCE_BUCKET_ID)
    .upload(path, input.file, {
      cacheControl: "3600",
      upsert: false,
      contentType: input.file.type,
    });
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true, path };
}
