export type NationalIdOcrGateResult =
  | { ok: true; confidence: number }
  | { ok: false; message: string };

export async function requestNationalIdOcrGate(params: {
  file: File;
  expectedLegalName: string;
  googleDisplayName: string | null;
  expectedNationalId?: string;
}): Promise<NationalIdOcrGateResult> {
  const body: FormData = new FormData();
  body.append("file", params.file);
  body.append("expectedLegalName", params.expectedLegalName.trim());
  if (params.googleDisplayName?.trim()) {
    body.append("googleDisplayName", params.googleDisplayName.trim());
  }
  const nid: string | undefined = params.expectedNationalId?.trim();
  if (nid && nid.length > 0) {
    body.append("expectedNationalId", nid);
  }
  const res: Response = await fetch("/api/identity/ocr-national-id", {
    method: "POST",
    body,
    credentials: "same-origin",
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok || json === null || typeof json !== "object") {
    const msg: string =
      typeof json === "object" &&
      json !== null &&
      "message" in json &&
      typeof (json as { message?: unknown }).message === "string"
        ? (json as { message: string }).message
        : "Identity document check failed.";
    return { ok: false, message: msg };
  }
  const o = json as { ok?: unknown; message?: unknown; confidence?: unknown };
  if (o.ok !== true) {
    const msg: string =
      typeof o.message === "string" ? o.message : "Identity mismatch.";
    return { ok: false, message: msg };
  }
  const conf: number =
    typeof o.confidence === "number" && Number.isFinite(o.confidence)
      ? o.confidence
      : 0;
  return { ok: true, confidence: conf };
}
