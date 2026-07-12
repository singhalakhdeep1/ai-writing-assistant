import type { PrivacySettings } from "@awa/types";
import { hostnameMatches } from "@awa/utils";

const PRIVACY_KEY = "awa:privacy";

const DEFAULT_PRIVACY: PrivacySettings = {
  onDeviceOnly: false,
  allowedSites: [],
  blockedSites: [],
  personalDictionary: [],
};

export async function getPrivacySettings(): Promise<PrivacySettings> {
  const result = await chrome.storage.local.get(PRIVACY_KEY);
  return (result[PRIVACY_KEY] as PrivacySettings) ?? DEFAULT_PRIVACY;
}

export async function savePrivacySettings(settings: PrivacySettings): Promise<void> {
  await chrome.storage.local.set({ [PRIVACY_KEY]: settings });
}

/** Returns true if AI requests are allowed on this hostname (Module 11). */
export async function isSiteAllowed(hostname: string): Promise<boolean> {
  const privacy = await getPrivacySettings();

  if (privacy.blockedSites.some((p) => hostnameMatches(hostname, p))) {
    return false;
  }

  if (privacy.allowedSites.length > 0) {
    return privacy.allowedSites.some((p) => hostnameMatches(hostname, p));
  }

  return true;
}

/** Masks personal dictionary words before sending to AI (replaces with placeholder). */
export function filterPersonalDictionary(text: string, dictionary: string[]): string {
  let result = text;
  for (const word of dictionary) {
    if (!word.trim()) continue;
    const regex = new RegExp(`\\b${escapeRegex(word.trim())}\\b`, "gi");
    result = result.replace(regex, "[PRIVATE]");
  }
  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
