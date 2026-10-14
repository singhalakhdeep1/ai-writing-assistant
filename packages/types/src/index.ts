/** Supported editable field types detected by the extension. */
export type EditorType = "input" | "textarea" | "contenteditable" | "shadow-dom";

/** Detected editable field on a webpage. */
export interface EditableField {
  id: string;
  type: EditorType;
  element: Element | null;
  hostname: string;
  label?: string;
}

/** Serializable editor field for cross-context messaging. */
export interface SerializableEditableField {
  id: string;
  type: EditorType;
  hostname: string;
  label?: string;
}

/** Supported AI writing actions. */
export type WritingAction =
  | "grammar"
  | "tone-formal"
  | "tone-friendly"
  | "rewrite"
  | "summarize"
  | "translate"
  | "expand"
  | "shorten"
  | "explain"
  | "custom";

/** LLM provider identifiers. */
export type AIProvider = "openai" | "gemini" | "anthropic" | "gemini-nano";

/** Writing context inferred from hostname (Module 10). */
export type WritingContext = "email" | "social" | "blog" | "code" | "resume" | "general";

/** Extension message types for cross-context communication. */
export type MessageType =
  | "PING"
  | "PONG"
  | "GET_TAB_INFO"
  | "TAB_INFO"
  | "EXTENSION_READY"
  | "EDITOR_DETECTED"
  | "SELECTION_CHANGED"
  | "AI_REQUEST"
  | "AI_STREAM_CHUNK"
  | "AI_STREAM_DONE"
  | "AI_STREAM_ERROR"
  | "AI_ABORT"
  | "GET_SELECTION"
  | "APPLY_SUGGESTION"
  | "RUN_ACTION"
  | "UNDO_SUGGESTION"
  | "SHOW_TOOLBAR"
  | "HIDE_TOOLBAR"
  | "APPLY_HIGHLIGHTS"
  | "CLEAR_HIGHLIGHTS"
  | "GET_SETTINGS"
  | "SAVE_SETTINGS"
  | "GET_ANALYTICS"
  | "CLEAR_CACHE"
  | "GET_DIAGNOSTICS";

/** Base message envelope sent between extension contexts. */
export interface ExtensionMessage<T = unknown> {
  type: MessageType;
  payload?: T;
  tabId?: number;
  timestamp: number;
}

/** Tab metadata returned by the background service worker. */
export interface TabInfo {
  tabId: number;
  url: string;
  title: string;
}

/** Text selection with position mapping. */
export interface TextSelection {
  text: string;
  startOffset: number;
  endOffset: number;
  fieldId: string;
  caretRect?: { top: number; left: number; width: number; height: number };
}

/** AI request payload. */
export interface AIRequest {
  action: WritingAction;
  text: string;
  context?: WritingContext;
  hostname?: string;
  provider?: AIProvider;
  customPrompt?: string;
  requestId?: string;
}

/** Streaming chunk from AI provider. */
export interface AIStreamChunk {
  requestId: string;
  action?: WritingAction;
  content: string;
  done: boolean;
}

/** Response wrapper for typed message handlers. */
export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Provider API keys stored locally. */
export interface ProviderKeys {
  openai?: string;
  gemini?: string;
  anthropic?: string;
}

/** Response cache and rate-limit preferences (HLD: caching + rate limiting). */
export interface PerformanceSettings {
  /** Reuse the answer for an identical request (same provider, action and text). */
  cacheEnabled: boolean;
  cacheTtlMinutes: number;
  /** Cloud requests allowed per provider per minute (token bucket, bursts up to this size). */
  requestsPerMinute: number;
}

export const DEFAULT_PERFORMANCE: PerformanceSettings = {
  cacheEnabled: true,
  cacheTtlMinutes: 30,
  requestsPerMinute: 20,
};

/** User settings stored in chrome.storage. */
export interface AppSettings {
  preferredProvider: AIProvider;
  providerKeys: ProviderKeys;
  privacy: PrivacySettings;
  performance?: PerformanceSettings;
}

/** Cache, rate-limit and recent-log snapshot shown on the Options page. */
export interface DiagnosticsSnapshot {
  cache: { entries: number; hits: number; misses: number };
  rateLimits: Array<{ provider: AIProvider; remaining: number; capacity: number }>;
  logs: Array<{
    timestamp: string;
    level: string;
    message: string;
    correlationId: string;
    data?: Record<string, unknown>;
    error?: string;
  }>;
}

/** User privacy preferences. */
export interface PrivacySettings {
  onDeviceOnly: boolean;
  allowedSites: string[];
  blockedSites: string[];
  personalDictionary: string[];
}

/** Local analytics snapshot (privacy-preserving). */
export interface AnalyticsSnapshot {
  suggestionsShown: number;
  suggestionsAccepted: number;
  suggestionsRejected: number;
  periodStart: number;
  periodEnd: number;
  /** Accepted edits grouped by mistake category (see `@awa/analytics` taxonomy). */
  mistakes?: Record<string, number>;
  /** Running totals for before/after reading-level comparison of accepted edits. */
  readingLevel?: ReadingLevelTotals;
}

/** Summed reading-level scores of accepted edits (divide by `samples` for averages). */
export interface ReadingLevelTotals {
  samples: number;
  gradeBefore: number;
  gradeAfter: number;
  easeBefore: number;
  easeAfter: number;
}

/** Highlight payload for content script. */
export interface HighlightPayload {
  fieldId: string;
  ranges: Array<{
    start: number;
    end: number;
    severity: "error" | "warning" | "suggestion";
    message: string;
  }>;
}

/** Suggestion apply payload. */
export interface SuggestionPayload {
  fieldId: string;
  original: string;
  modified: string;
  requestId: string;
  action?: WritingAction;
}
