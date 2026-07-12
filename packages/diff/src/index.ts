/** Sentence-level diff result (Module 7). */
export interface SentenceDiff {
  original: string;
  modified: string;
  changed: boolean;
}

/** Splits text into sentences using Intl.Segmenter (Module 7). */
export function segmentSentences(text: string, locale = "en"): string[] {
  const segmenter = new Intl.Segmenter(locale, { granularity: "sentence" });
  return [...segmenter.segment(text)].map((s) => s.segment.trim()).filter(Boolean);
}

/** Compares sentences and returns only changed ones (Module 7 — incremental analysis). */
export function diffSentences(original: string, modified: string): SentenceDiff[] {
  const origSentences = segmentSentences(original);
  const modSentences = segmentSentences(modified);
  const maxLen = Math.max(origSentences.length, modSentences.length);
  const diffs: SentenceDiff[] = [];

  for (let i = 0; i < maxLen; i++) {
    const orig = origSentences[i] ?? "";
    const mod = modSentences[i] ?? "";
    diffs.push({ original: orig, modified: mod, changed: orig !== mod });
  }

  return diffs;
}

/** Returns only changed sentences to minimize AI re-processing (Module 7). */
export function getChangedSentences(original: string, modified: string): SentenceDiff[] {
  return diffSentences(original, modified).filter((d) => d.changed);
}

/** Simple word-level diff for display (Module 7). */
export function wordDiff(original: string, modified: string): { added: string[]; removed: string[] } {
  const origWords = new Set(original.split(/\s+/));
  const modWords = new Set(modified.split(/\s+/));
  return {
    removed: [...origWords].filter((w) => !modWords.has(w)),
    added: [...modWords].filter((w) => !origWords.has(w)),
  };
}
