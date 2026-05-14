/**
 * Returns a same-origin path safe for post-login redirects, or null if invalid.
 */
export function sanitizeInternalNextPath(raw: string | null): string | null {
  if (raw === null || typeof raw !== "string") {
    return null;
  }
  const trimmed: string = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }
  if (trimmed.includes("://") || trimmed.toLowerCase().includes("javascript:")) {
    return null;
  }
  return trimmed;
}
