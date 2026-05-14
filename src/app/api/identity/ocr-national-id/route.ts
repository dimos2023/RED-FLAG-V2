import { createWorker } from "tesseract.js";
import { NextResponse } from "next/server";
import {
  isIdentityConsistentWithOcr,
  nationalIdMatchesOcr,
  ocrTextContainsExpectedName,
  ocrTextOverlapsGoogleName,
} from "@/lib/identity_name_match";

export const runtime = "nodejs";

const MAX_BYTES: number = 8 * 1024 * 1024;
const MIN_OCR_CONFIDENCE: number = 38;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

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
  const nationalEntry: FormDataEntryValue | null = form.get(
    "expectedNationalId",
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
  const rawNationalId: string =
    typeof nationalEntry === "string" ? nationalEntry.trim() : "";
  const nationalDigits: string = digitsOnly(rawNationalId);
  if (nationalDigits.length > 0 && nationalDigits.length < 8) {
    console.log("[ocr-national-id] reject: national id digit count too low", {
      digitCount: nationalDigits.length,
    });
    return NextResponse.json(
      {
        ok: false,
        message:
          "National ID number must contain at least 8 digits when provided.",
      },
      { status: 400 },
    );
  }
  const expectedNationalForMatch: string | null =
    nationalDigits.length >= 8 ? nationalDigits : null;
  console.log("[ocr-national-id] request meta", {
    fileBytes: fileEntry.size,
    expectedLegalNameLength: expectedLegalName.length,
    hasGoogleDisplayName: Boolean(googleDisplayName),
    nationalIdDigitCount: nationalDigits.length,
    willMatchNationalId: Boolean(expectedNationalForMatch),
  });
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  try {
    const buffer: Buffer = Buffer.from(await fileEntry.arrayBuffer());
    worker = await createWorker("ara+eng");
    const {
      data: { text, confidence },
    } = await worker.recognize(buffer);
    const ocrText: string = text ?? "";
    const confNum: number = typeof confidence === "number" ? confidence : 0;
    console.log("[ocr-national-id] tesseract done", {
      confidence: confNum,
      ocrTextLength: ocrText.length,
      meetsMinConfidence: confNum >= MIN_OCR_CONFIDENCE,
    });
    if (typeof confidence === "number" && confidence < MIN_OCR_CONFIDENCE) {
      console.log("[ocr-national-id] reject: confidence below threshold", {
        confidence: confNum,
        min: MIN_OCR_CONFIDENCE,
      });
      return NextResponse.json({
        ok: false,
        message:
          "Could not read the document clearly. Please upload a sharper, well-lit photo.",
        confidence: confNum,
      });
    }
    const nameOnDoc: boolean = ocrTextContainsExpectedName(
      ocrText,
      expectedLegalName,
    );
    const googleOverlap: boolean = ocrTextOverlapsGoogleName(
      ocrText,
      googleDisplayName,
    );
    const nationalMatch: boolean =
      expectedNationalForMatch === null
        ? true
        : nationalIdMatchesOcr(ocrText, expectedNationalForMatch);
    const identityOk: boolean = isIdentityConsistentWithOcr(
      ocrText,
      expectedLegalName,
      googleDisplayName,
      expectedNationalForMatch,
    );
    console.log("[ocr-national-id] match breakdown", {
      nameOnDoc,
      googleOverlap,
      nationalMatch,
      identityOk,
    });
    if (!identityOk) {
      let message: string =
        "The name on the document does not match your entered name or your Google account. Check the data or upload a clearer image.";
      if (nameOnDoc && googleOverlap && !nationalMatch) {
        message =
          "The national ID number on the document does not match the number you entered. Verify the digits or upload a clearer image.";
      } else if (!nameOnDoc) {
        message =
          "The legal name on the document does not match what you entered. Check spelling or upload a clearer image.";
      } else if (!googleOverlap) {
        message =
          "The document text does not align with your Google account display name. Update your Google name or upload a document that matches.";
      }
      console.log("[ocr-national-id] reject: identity mismatch", {
        messageKind: !nationalMatch && nameOnDoc && googleOverlap ? "national" : "name_or_google",
      });
      return NextResponse.json({
        ok: false,
        message,
        confidence: confNum,
      });
    }
    console.log("[ocr-national-id] success", { confidence: confNum });
    return NextResponse.json({
      ok: true,
      confidence: confNum,
    });
  } catch (err: unknown) {
    const msg: string = err instanceof Error ? err.message : String(err);
    console.log("[ocr-national-id] worker error", { message: msg });
    return NextResponse.json(
      { ok: false, message: "OCR processing failed. Try again." },
      { status: 422 },
    );
  } finally {
    if (worker !== null) {
      await worker.terminate().catch(() => {
        /* ignore */
      });
    }
  }
}
