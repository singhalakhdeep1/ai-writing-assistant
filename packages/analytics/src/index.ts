import type { AnalyticsSnapshot } from "@awa/types";

const STORAGE_KEY = "awa:analytics";

/** Records a suggestion shown event (Module 12 — local only). */
export async function recordSuggestionShown(): Promise<void> {
  const snapshot = await getAnalytics();
  snapshot.suggestionsShown += 1;
  await saveAnalytics(snapshot);
}

/** Records a suggestion accepted event. */
export async function recordSuggestionAccepted(): Promise<void> {
  const snapshot = await getAnalytics();
  snapshot.suggestionsAccepted += 1;
  await saveAnalytics(snapshot);
}

/** Records a suggestion rejected event. */
export async function recordSuggestionRejected(): Promise<void> {
  const snapshot = await getAnalytics();
  snapshot.suggestionsRejected += 1;
  await saveAnalytics(snapshot);
}

/** Returns current analytics snapshot. */
export async function getAnalytics(): Promise<AnalyticsSnapshot> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return (
    (result[STORAGE_KEY] as AnalyticsSnapshot) ?? {
      suggestionsShown: 0,
      suggestionsAccepted: 0,
      suggestionsRejected: 0,
      periodStart: Date.now(),
      periodEnd: Date.now(),
    }
  );
}

/** Calculates acceptance rate as percentage. */
export function getAcceptanceRate(snapshot: AnalyticsSnapshot): number {
  if (snapshot.suggestionsShown === 0) return 0;
  return Math.round((snapshot.suggestionsAccepted / snapshot.suggestionsShown) * 100);
}

/** Generates a weekly analytics report (Module 12). */
export function generateWeeklyReport(snapshot: AnalyticsSnapshot): string {
  const rate = getAcceptanceRate(snapshot);
  const days = Math.max(
    1,
    Math.round((snapshot.periodEnd - snapshot.periodStart) / (1000 * 60 * 60 * 24)),
  );
  const lines = [
    `Weekly Writing Assistant Report`,
    `Period: ${days} day(s)`,
    `Suggestions shown: ${snapshot.suggestionsShown}`,
    `Accepted: ${snapshot.suggestionsAccepted}`,
    `Rejected: ${snapshot.suggestionsRejected}`,
    `Acceptance rate: ${rate}%`,
    rate >= 70 ? "Great job — you're using suggestions effectively!" : "Tip: try grammar fixes on shorter selections first.",
  ];
  return lines.join("\n");
}

/** Resets analytics counters. */
export async function resetAnalytics(): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      suggestionsShown: 0,
      suggestionsAccepted: 0,
      suggestionsRejected: 0,
      periodStart: Date.now(),
      periodEnd: Date.now(),
    },
  });
}

async function saveAnalytics(snapshot: AnalyticsSnapshot): Promise<void> {
  snapshot.periodEnd = Date.now();
  await chrome.storage.local.set({ [STORAGE_KEY]: snapshot });
}
