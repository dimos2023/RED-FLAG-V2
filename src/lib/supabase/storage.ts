import type { SupabaseClient } from "@supabase/supabase-js";

/** Must match `supabase/migrations/*_fraud_evidence_bucket.sql` */
export const FRAUD_EVIDENCE_BUCKET_ID = "fraud-evidence";

const DEFAULT_FILE_EXTENSION: string = "bin";

const ALLOWED_MIME = new Set<string>([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXTENSION_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/** Safe for optional logo / evidence picks from `<input type="file">`. */
export function isValidEvidenceFile(
  file: File | null | undefined,
): file is File {
  if (file === null || file === undefined) {
    return false;
  }
  if (!(file instanceof File)) {
    return false;
  }
  if (file.size <= 0) {
    return false;
  }
  const name: string | undefined = file.name?.trim();
  return Boolean(name && name.length > 0);
}

export function extractFileExtension(
  file: File | null | undefined,
): string {
  if (!isValidEvidenceFile(file)) {
    return DEFAULT_FILE_EXTENSION;
  }
  const name: string = file.name.trim();
  const dotIndex: number = name.lastIndexOf(".");
  if (dotIndex < 0 || dotIndex === name.length - 1) {
    return extensionFromMimeType(file.type) ?? DEFAULT_FILE_EXTENSION;
  }
  const rawExt: string = name.slice(dotIndex + 1).toLowerCase();
  if (rawExt.length === 0 || rawExt.length > 12) {
    return DEFAULT_FILE_EXTENSION;
  }
  return rawExt;
}

function extensionFromMimeType(mimeType: string): string | null {
  const mime: string = mimeType.trim().toLowerCase();
  if (mime === "application/pdf") {
    return "pdf";
  }
  if (mime === "image/jpeg") {
    return "jpg";
  }
  if (mime === "image/png") {
    return "png";
  }
  if (mime === "image/webp") {
    return "webp";
  }
  if (mime === "image/gif") {
    return "gif";
  }
  return null;
}

function resolveContentType(file: File): string {
  const mime: string = file.type.trim().toLowerCase();
  if (ALLOWED_MIME.has(mime)) {
    return mime;
  }
  const fromExt: string | undefined =
    EXTENSION_TO_MIME[extractFileExtension(file)];
  if (fromExt) {
    return fromExt;
  }
  return "";
}

function sanitizeFileName(fileName: string | null | undefined): string {
  const base: string =
    (fileName ?? "").replace(/[/\\]/g, "_").trim() || "document";
  return base.slice(0, 180);
}

function buildStorageObjectName(file: File): string {
  const ext: string = extractFileExtension(file);
  const stem: string = sanitizeFileName(file.name);
  const dotIndex: number = stem.lastIndexOf(".");
  const baseName: string =
    dotIndex > 0 ? stem.slice(0, dotIndex) : stem;
  return `${crypto.randomUUID()}_${baseName}.${ext}`;
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
  const file: File | null | undefined = input.file;
  if (!isValidEvidenceFile(file)) {
    return { ok: false, message: "No valid file selected for upload." };
  }
  const contentType: string = resolveContentType(file);
  if (!ALLOWED_MIME.has(contentType)) {
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
  const objectName: string = buildStorageObjectName(file);
  const path: string = `${folder}/${objectName}`;
  const { error } = await supabase.storage
    .from(FRAUD_EVIDENCE_BUCKET_ID)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType,
    });
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true, path };
}
