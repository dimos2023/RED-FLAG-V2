const NON_NAME_CHARS: RegExp = /[^a-z0-9\u0600-\u06FF\s]/gi;

export function normalizeNameTokens(value: string): string[] {
  const folded: string = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(NON_NAME_CHARS, " ");
  return folded
    .split(/\s+/)
    .map((t: string) => t.trim())
    .filter((t: string) => t.length > 1);
}

export function ocrTextContainsExpectedName(
  ocrText: string,
  expectedLegalName: string,
): boolean {
  const haystack: string = normalizeNameTokens(ocrText).join(" ");
  const tokens: string[] = normalizeNameTokens(expectedLegalName);
  if (tokens.length === 0) {
    return false;
  }
  return tokens.every((t: string) => haystack.includes(t));
}

export function ocrTextOverlapsGoogleName(
  ocrText: string,
  googleDisplayName: string | null,
): boolean {
  if (!googleDisplayName?.trim()) {
    return true;
  }
  const haystack: string = normalizeNameTokens(ocrText).join(" ");
  const gTokens: string[] = normalizeNameTokens(googleDisplayName).filter(
    (t: string) => t.length > 2,
  );
  if (gTokens.length === 0) {
    return true;
  }
  return gTokens.some((t: string) => haystack.includes(t));
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Finds digit runs in OCR text (e.g. national ID). Keeps longest plausible run (≥ 8 digits).
 */
export function extractNationalIdDigitRuns(ocrText: string): string[] {
  const matches: RegExpMatchArray | null = ocrText.match(/\d{8,16}/g);
  if (!matches) {
    return [];
  }
  return [...new Set(matches.map((m: string) => digitsOnly(m)))];
}

export function nationalIdMatchesOcr(
  ocrText: string,
  expectedNationalId: string,
): boolean {
  const expected: string = digitsOnly(expectedNationalId);
  if (expected.length < 8) {
    return false;
  }
  const runs: string[] = extractNationalIdDigitRuns(ocrText);
  const compactOcr: string = digitsOnly(ocrText);
  return (
    runs.some((r: string) => r.includes(expected) || expected.includes(r)) ||
    compactOcr.includes(expected)
  );
}

export function isIdentityConsistentWithOcr(
  ocrText: string,
  expectedLegalName: string,
  googleDisplayName: string | null,
  expectedNationalId?: string | null,
): boolean {
  if (!ocrText.trim()) {
    return false;
  }
  if (!ocrTextContainsExpectedName(ocrText, expectedLegalName)) {
    return false;
  }
  if (!ocrTextOverlapsGoogleName(ocrText, googleDisplayName)) {
    return false;
  }
  const nid: string | undefined = expectedNationalId?.trim();
  if (nid && nid.length > 0) {
    return nationalIdMatchesOcr(ocrText, nid);
  }
  return true;
}
