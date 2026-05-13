import type { AccountType } from "@/types";

export const PENDING_PROFILE_STORAGE_KEY = "red-flag-pending-profile-v1";

/** Max total base64 length for deferred uploads after email confirmation (~2.5 MiB). */
export const PENDING_PROFILE_MAX_BASE64 = 3_495_253;

export type PendingProfileFormV1 = {
  version: 1;
  userId: string;
  userEmail: string;
  accountType: AccountType;
  phone: string;
  fullLegalName: string;
  shippingLine1: string;
  shippingLine2: string;
  shippingCity: string;
  shippingRegion: string;
  shippingPostalCode: string;
  shippingCountry: string;
  companyLegalName: string;
  crNumber: string;
  companyEmail: string;
  companyAddressLine1: string;
  companyAddressLine2: string;
  companyCity: string;
  companyRegion: string;
  companyPostalCode: string;
  companyCountry: string;
  companyLocationNote: string;
};

export type PendingProfileFileV1 = {
  name: string;
  type: string;
  dataBase64: string;
};

export type PendingProfilePayloadV1 = {
  version: 1;
  form: PendingProfileFormV1;
  files: PendingProfileFileV1[];
};

export function readPendingProfilePayload(): PendingProfilePayloadV1 | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw: string | null = window.sessionStorage.getItem(
      PENDING_PROFILE_STORAGE_KEY,
    );
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as { version?: unknown }).version !== 1
    ) {
      return null;
    }
    return parsed as PendingProfilePayloadV1;
  } catch {
    return null;
  }
}

export function writePendingProfilePayload(
  payload: PendingProfilePayloadV1,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(
    PENDING_PROFILE_STORAGE_KEY,
    JSON.stringify(payload),
  );
}

export function clearPendingProfilePayload(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(PENDING_PROFILE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function readFileAsDataUrlBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (): void => {
      const result: string | ArrayBuffer | null = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unexpected read result"));
        return;
      }
      const comma: number = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = (): void => {
      reject(reader.error ?? new Error("File read failed"));
    };
    reader.readAsDataURL(file);
  });
}

export async function filesToPendingPayload(
  files: File[],
): Promise<
  | { ok: true; list: PendingProfileFileV1[] }
  | { ok: false; message: string }
> {
  const list: PendingProfileFileV1[] = [];
  let totalBase64 = 0;
  for (const file of files) {
    const dataBase64: string = await readFileAsDataUrlBase64(file);
    totalBase64 += dataBase64.length;
    if (totalBase64 > PENDING_PROFILE_MAX_BASE64) {
      return {
        ok: false,
        message:
          "Total file size is too large to defer upload until after email confirmation. Use smaller files or ask the admin to disable email confirmation for immediate upload.",
      };
    }
    list.push({ name: file.name, type: file.type, dataBase64 });
  }
  return { ok: true, list };
}

export function pendingFileToFile(entry: PendingProfileFileV1): File {
  const binary: string = atob(entry.dataBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], entry.name, { type: entry.type });
}
