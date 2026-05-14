import { createWorker } from "tesseract.js";
import { NextResponse } from "next/server";
import { isIdentityConsistentWithOcr } from "@/lib/identity_name_match";

export const runtime = "nodejs";

const MAX_BYTES: number = 8 * 1024 * 1024;
const MIN_OCR_CONFIDENCE: number = 38;

export async function POST(request: Request): Promise<NextResponse> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid form data." },
      { status: 400 },
    );
  }
  const fileEntry: FormDataEntryValue | null = form.get("file");
  const expectedEntry: FormDataEntryValue | null = form.get(
    "expectedLegalName",
  );
  const googleEntry: FormDataEntryValue | null = form.get(
    "googleDisplayName",
  );
  if (!(fileEntry instanceof File)) {
    return NextResponse.json(
      { ok: false, message: "Missing identity document file." },
      { status: 400 },
    );
  }
  if (fileEntry.size <= 0 || fileEntry.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, message: "Document file is too large or empty." },
      { status: 400 },
    );
  }
  const expectedLegalName: string =
    typeof expectedEntry === "string" ? expectedEntry.trim() : "";
  if (expectedLegalName.length < 3) {
    return NextResponse.json(
      { ok: false, message: "Expected legal name is missing." },
      { status: 400 },
    );
  }
  const googleDisplayName: string | null =
    typeof googleEntry === "string" && googleEntry.trim().length > 0
      ? googleEntry.trim()
      : null;
  const buffer: Buffer = Buffer.from(await fileEntry.arrayBuffer());
  const worker = await createWorker("ara+eng");
  try {
    const {
      data: { text, confidence },
    } = await worker.recognize(buffer);
    const ocrText: string = text ?? "";
    if (typeof confidence === "number" && confidence < MIN_OCR_CONFIDENCE) {
      return NextResponse.json({
        ok: false,
        message:
          "Could not read the document clearly. Please upload a sharper, well-lit photo.",
        confidence,
      });
    }
    if (
      !isIdentityConsistentWithOcr(
        ocrText,
        expectedLegalName,
        googleDisplayName,
      )
    ) {
      return NextResponse.json({
        ok: false,
        message:
          "The name on the document does not match your entered name or your Google account. Check the data or upload a clearer image.",
        confidence,
      });
    }
    return NextResponse.json({
      ok: true,
      confidence: typeof confidence === "number" ? confidence : 0,
    });
  } finally {
    await worker.terminate().catch(() => {
      /* ignore */
    });
  }
}
