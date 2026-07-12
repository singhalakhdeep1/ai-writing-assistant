import { describe, expect, it } from "vitest";
import { generateWeeklyReport, getAcceptanceRate } from "./index";
import type { AnalyticsSnapshot } from "@awa/types";

describe("@awa/analytics", () => {
  it("getAcceptanceRate calculates percentage", () => {
    const snapshot: AnalyticsSnapshot = {
      suggestionsShown: 10,
      suggestionsAccepted: 7,
      suggestionsRejected: 3,
      periodStart: Date.now() - 7 * 86400000,
      periodEnd: Date.now(),
    };
    expect(getAcceptanceRate(snapshot)).toBe(70);
  });

  it("generateWeeklyReport includes key metrics", () => {
    const snapshot: AnalyticsSnapshot = {
      suggestionsShown: 20,
      suggestionsAccepted: 15,
      suggestionsRejected: 5,
      periodStart: Date.now() - 7 * 86400000,
      periodEnd: Date.now(),
    };
    const report = generateWeeklyReport(snapshot);
    expect(report).toContain("Acceptance rate: 75%");
    expect(report).toContain("Suggestions shown: 20");
  });
});
