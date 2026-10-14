import { useAnalytics, useSettings } from "@awa/hooks";
import {
  generateWeeklyReport,
  getReadingLevelSummary,
  getTopMistakes,
  MISTAKE_LABELS,
  type MistakeCategory,
} from "@awa/analytics";
import { Button } from "@awa/ui/button";
import { Card } from "@awa/ui/card";
import { Header } from "@awa/ui/header";
import { MetricRow } from "@awa/ui/metric-row";
import { createMessage } from "@awa/messaging";
import {
  DEFAULT_PERFORMANCE,
  type AIProvider,
  type DiagnosticsSnapshot,
  type PerformanceSettings,
  type PrivacySettings,
  type ProviderKeys,
} from "@awa/types";
import { useCallback, useEffect, useState } from "react";

const PROVIDERS: Array<{ id: keyof ProviderKeys; label: string; placeholder: string }> = [
  { id: "openai", label: "OpenAI", placeholder: "sk-..." },
  { id: "gemini", label: "Google Gemini", placeholder: "AI..." },
  { id: "anthropic", label: "Anthropic", placeholder: "sk-ant-..." },
];

const SHORTCUTS: Array<{ keys: string; description: string }> = [
  { keys: "Alt+Shift+G", description: "Fix grammar in the selected text" },
  { keys: "Alt+Shift+R", description: "Rewrite the selected text" },
  { keys: "Alt+Shift+Z", description: "Undo the last applied suggestion" },
  { keys: "Esc", description: "Dismiss the floating toolbar" },
];

export function App() {
  const version = chrome.runtime.getManifest().version;
  const { settings, isLoading, save } = useSettings();
  const { analytics, reload: reloadAnalytics } = useAnalytics();

  const [keys, setKeys] = useState<ProviderKeys>({});
  const [preferred, setPreferred] = useState<AIProvider>("openai");
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    onDeviceOnly: false,
    allowedSites: [],
    blockedSites: [],
    personalDictionary: [],
  });
  const [allowedInput, setAllowedInput] = useState("");
  const [blockedInput, setBlockedInput] = useState("");
  const [dictInput, setDictInput] = useState("");
  const [performance, setPerformance] = useState<PerformanceSettings>(DEFAULT_PERFORMANCE);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsSnapshot | null>(null);
  const [cacheMessage, setCacheMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const readingLevel = analytics ? getReadingLevelSummary(analytics) : null;
  const topMistakes = analytics ? getTopMistakes(analytics) : [];

  useEffect(() => {
    if (!settings) return;
    setKeys(settings.providerKeys ?? {});
    setPreferred(settings.preferredProvider ?? "openai");
    setPrivacy(settings.privacy);
    setAllowedInput(settings.privacy.allowedSites.join("\n"));
    setBlockedInput(settings.privacy.blockedSites.join("\n"));
    setDictInput(settings.privacy.personalDictionary.join("\n"));
    setPerformance({ ...DEFAULT_PERFORMANCE, ...settings.performance });
  }, [settings]);

  const loadDiagnostics = useCallback(async () => {
    const response = await chrome.runtime.sendMessage(createMessage("GET_DIAGNOSTICS"));
    if (response?.success) setDiagnostics(response.data as DiagnosticsSnapshot);
  }, []);

  useEffect(() => {
    void loadDiagnostics();
  }, [loadDiagnostics]);

  const handleClearCache = async () => {
    const response = await chrome.runtime.sendMessage(createMessage("CLEAR_CACHE"));
    const removed = (response?.data as { removed?: number } | undefined)?.removed ?? 0;
    setCacheMessage(`Removed ${removed} cached answer${removed === 1 ? "" : "s"}.`);
    void loadDiagnostics();
    setTimeout(() => setCacheMessage(""), 3000);
  };

  const clampNumber = (value: string, min: number, max: number, fallback: number) => {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };

  const handleSave = async () => {
    const updatedPrivacy: PrivacySettings = {
      ...privacy,
      allowedSites: allowedInput
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      blockedSites: blockedInput
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      personalDictionary: dictInput
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    await save({
      preferredProvider: preferred,
      providerKeys: {
        openai: keys.openai,
        gemini: keys.gemini,
        anthropic: keys.anthropic,
      },
      privacy: updatedPrivacy,
      performance,
    });

    setSaved(true);
    void reloadAnalytics();
    void loadDiagnostics();
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header title="Settings" subtitle={`AI Writing Assistant v${version}`} />
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <Card title="AI Providers" description="API keys stored locally in chrome.storage">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Preferred Provider
              </label>
              <select
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={preferred}
                onChange={(e) => setPreferred(e.target.value as AIProvider)}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
                <option value="gemini-nano">Gemini Nano (On-Device)</option>
              </select>
            </div>
            {PROVIDERS.map((p) => (
              <div key={p.id}>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {p.label} API Key
                </label>
                <input
                  type="password"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
                  placeholder={p.placeholder}
                  value={keys[p.id] ?? ""}
                  onChange={(e) => setKeys({ ...keys, [p.id]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Privacy"
          description="On-device inference, site allowlist/blocklist, personal dictionary"
        >
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={privacy.onDeviceOnly}
                onChange={(e) => setPrivacy({ ...privacy, onDeviceOnly: e.target.checked })}
              />
              On-device only (Gemini Nano — no cloud API calls)
            </label>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Allowed Sites (one per line, empty = all)
              </label>
              <textarea
                className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
                rows={3}
                placeholder="mail.google.com&#10;www.notion.so"
                value={allowedInput}
                onChange={(e) => setAllowedInput(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Blocked Sites (one per line)
              </label>
              <textarea
                className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
                rows={3}
                placeholder="*.bank.com&#10;healthcare.example.com"
                value={blockedInput}
                onChange={(e) => setBlockedInput(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Personal Dictionary (words to preserve, one per line)
              </label>
              <textarea
                className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
                rows={3}
                placeholder="YourName&#10;CompanyName"
                value={dictInput}
                onChange={(e) => setDictInput(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card
          title="Performance"
          description="Reuse identical answers and cap cloud requests per provider"
        >
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={performance.cacheEnabled}
                onChange={(e) => setPerformance({ ...performance, cacheEnabled: e.target.checked })}
              />
              Reuse the answer when the same text, action and provider are requested again
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Keep cached answers (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={performance.cacheTtlMinutes}
                  disabled={!performance.cacheEnabled}
                  onChange={(e) =>
                    setPerformance({
                      ...performance,
                      cacheTtlMinutes: clampNumber(e.target.value, 1, 1440, 30),
                    })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Cloud requests per minute (per provider)
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={performance.requestsPerMinute}
                  onChange={(e) =>
                    setPerformance({
                      ...performance,
                      requestsPerMinute: clampNumber(e.target.value, 1, 120, 20),
                    })
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={() => void handleClearCache()}>
                Clear cached answers
              </Button>
              {cacheMessage && <span className="text-xs text-slate-500">{cacheMessage}</span>}
            </div>
          </div>
        </Card>

        {diagnostics && (
          <Card
            title="Diagnostics"
            description="Cache, rate limits and recent structured log events (stored locally)"
          >
            <div className="space-y-1" data-testid="diagnostics">
              <MetricRow name="Cached answers" value={String(diagnostics.cache.entries)} />
              <MetricRow
                name="Cache hits / misses (this session)"
                value={`${diagnostics.cache.hits} / ${diagnostics.cache.misses}`}
              />
              {diagnostics.rateLimits.map((r) => (
                <MetricRow
                  key={r.provider}
                  name={`${r.provider} requests available`}
                  value={`${r.remaining} / ${r.capacity}`}
                />
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Recent events</p>
              <Button variant="secondary" onClick={() => void loadDiagnostics()}>
                Refresh
              </Button>
            </div>
            {diagnostics.logs.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">No events yet.</p>
            ) : (
              <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto font-mono text-xs text-slate-700">
                {diagnostics.logs.map((log, i) => (
                  <li key={`${log.timestamp}-${i}`} className="rounded bg-slate-100 px-2 py-1">
                    <span className="text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>{" "}
                    <span className={log.level === "error" ? "text-red-600" : "text-slate-600"}>
                      {log.level}
                    </span>{" "}
                    {log.message}
                    {typeof log.data?.eventType === "string" && (
                      <span className="text-slate-500"> [{log.data.eventType}]</span>
                    )}
                    {log.error && <span className="text-red-600"> — {log.error}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {analytics && (
          <Card title="Analytics" description="Local-only metrics — never sent to servers">
            <div className="space-y-1">
              <MetricRow name="Suggestions Shown" value={String(analytics.suggestionsShown)} />
              <MetricRow name="Accepted" value={String(analytics.suggestionsAccepted)} />
              <MetricRow name="Rejected" value={String(analytics.suggestionsRejected)} />
              <MetricRow name="Acceptance Rate" value={`${analytics.acceptanceRate}%`} />
            </div>
            <pre className="mt-4 whitespace-pre-wrap rounded bg-slate-100 p-3 text-xs text-slate-700">
              {generateWeeklyReport({
                ...analytics,
                periodStart: analytics.periodStart ?? Date.now() - 7 * 86400000,
                periodEnd: analytics.periodEnd ?? Date.now(),
              })}
            </pre>

            {readingLevel && (
              <div className="mt-4 space-y-1" data-testid="reading-level">
                <p className="text-sm font-medium text-slate-700">Reading level (accepted edits)</p>
                <MetricRow
                  name="Grade level"
                  value={`${readingLevel.gradeBefore} → ${readingLevel.gradeAfter}`}
                />
                <MetricRow
                  name="Reading ease"
                  value={`${readingLevel.easeBefore} → ${readingLevel.easeAfter}`}
                />
              </div>
            )}

            <div className="mt-4 space-y-1" data-testid="mistake-taxonomy">
              <p className="text-sm font-medium text-slate-700">What you fix most</p>
              {topMistakes.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Accept a few suggestions to see your patterns.
                </p>
              ) : (
                topMistakes.map((m) => (
                  <MetricRow
                    key={m.category}
                    name={MISTAKE_LABELS[m.category as MistakeCategory] ?? m.category}
                    value={String(m.count)}
                  />
                ))
              )}
            </div>
          </Card>
        )}

        <Card title="Keyboard Shortcuts" description="Change them at chrome://extensions/shortcuts">
          <ul className="space-y-1 text-sm text-slate-700">
            {SHORTCUTS.map((s) => (
              <li key={s.keys} className="flex items-center justify-between">
                <span>{s.description}</span>
                <kbd className="rounded border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-xs">
                  {s.keys}
                </kbd>
              </li>
            ))}
          </ul>
        </Card>

        <Button className="w-full" disabled={isLoading} onClick={() => void handleSave()}>
          {isLoading ? "Loading…" : saved ? "Saved!" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
