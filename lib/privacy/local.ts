import { LOCAL_STORAGE_KEY } from "@/types";

export const PRIVACY_PATH = "/privacy";

const CONSENT_EXPORT_FILENAME = "jubilation-consents.json";

/** Clears the persisted plan on this device. No server copy in this lot. */
export function eraseLocalPlan(
  storage: Pick<Storage, "removeItem"> | null | undefined =
    typeof globalThis.localStorage === "undefined"
      ? null
      : globalThis.localStorage
): void {
  storage?.removeItem(LOCAL_STORAGE_KEY);
}

export function consentExportFilename(): string {
  return CONSENT_EXPORT_FILENAME;
}

export function isPrivacyPath(pathname: string | null | undefined): boolean {
  return pathname === PRIVACY_PATH || Boolean(pathname?.startsWith(`${PRIVACY_PATH}/`));
}
