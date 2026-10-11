/** Sentence-level diff result (Module 7). */
export interface SentenceDiff {
  original: string;
  modified: string;
  changed: boolean;
}

/** Diff operation types for Myers/LCS algorithm */
export interface DiffOperation {
  type: "insert" | "delete" | "equal";
  text: string;
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
export function wordDiff(
  original: string,
  modified: string,
): { added: string[]; removed: string[] } {
  const origWords = new Set(original.split(/\s+/));
  const modWords = new Set(modified.split(/\s+/));
  return {
    removed: [...origWords].filter((w) => !modWords.has(w)),
    added: [...modWords].filter((w) => !origWords.has(w)),
  };
}

/**
 * Myers Diff Algorithm - O(ND) diff algorithm
 * Produces minimal edit script between two sequences
 */
export function myersDiff<T>(original: T[], modified: T[]): DiffOperation[] {
  const m = original.length;
  const n = modified.length;

  if (m === 0) {
    return modified.map((text) => ({ type: "insert" as const, text: String(text) }));
  }
  if (n === 0) {
    return original.map((text) => ({ type: "delete" as const, text: String(text) }));
  }

  const max = m + n;
  const offset = max + 1;
  const v = new Int32Array(2 * max + 3);
  const trace: Int32Array[] = [];

  for (let d = 0; d <= max; d++) {
    trace.push(v.slice());

    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[offset + k - 1]! < v[offset + k + 1]!)) {
        x = v[offset + k + 1]!;
      } else {
        x = v[offset + k - 1]! + 1;
      }

      let y = x - k;
      while (x < m && y < n && original[x] === modified[y]) {
        x++;
        y++;
      }

      v[offset + k] = x;

      if (x >= m && y >= n) {
        return backtrack(trace, original, modified, offset);
      }
    }
  }

  return [];
}

/** Walks the saved V snapshots backwards to rebuild the edit script. */
function backtrack<T>(
  trace: Int32Array[],
  original: T[],
  modified: T[],
  offset: number,
): DiffOperation[] {
  const operations: DiffOperation[] = [];
  let x = original.length;
  let y = modified.length;

  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d]!;
    const k = x - y;

    const prevK = k === -d || (k !== d && v[offset + k - 1]! < v[offset + k + 1]!) ? k + 1 : k - 1;
    const prevX = v[offset + prevK]!;
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      operations.push({ type: "equal", text: String(original[x - 1]) });
      x--;
      y--;
    }

    if (d > 0) {
      if (x === prevX) {
        operations.push({ type: "insert", text: String(modified[y - 1]) });
        y--;
      } else {
        operations.push({ type: "delete", text: String(original[x - 1]) });
        x--;
      }
    }
  }

  return operations.reverse();
}

/**
 * Longest Common Subsequence (LCS) using dynamic programming
 * Returns the LCS between two sequences
 */
export function lcs<T>(seq1: T[], seq2: T[]): T[] {
  const m = seq1.length;
  const n = seq2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  const at = (i: number, j: number): number => dp[i]![j]!;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] =
        seq1[i - 1] === seq2[j - 1] ? at(i - 1, j - 1) + 1 : Math.max(at(i - 1, j), at(i, j - 1));
    }
  }

  const result: T[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (seq1[i - 1] === seq2[j - 1]) {
      result.push(seq1[i - 1] as T);
      i--;
      j--;
    } else if (at(i - 1, j) > at(i, j - 1)) {
      i--;
    } else {
      j--;
    }
  }

  return result.reverse();
}

/**
 * Character-level Myers diff for fine-grained text comparison
 */
export function charDiff(original: string, modified: string): DiffOperation[] {
  const origChars = original.split("");
  const modChars = modified.split("");
  return myersDiff(origChars, modChars);
}

/**
 * Word-level Myers diff for word-by-word comparison
 */
export function wordMyersDiff(original: string, modified: string): DiffOperation[] {
  const origWords = original.split(/\s+/);
  const modWords = modified.split(/\s+/);
  return myersDiff(origWords, modWords);
}

/**
 * Compute similarity ratio between two texts using LCS
 */
export function similarityRatio(original: string, modified: string): number {
  const origWords = original.split(/\s+/);
  const modWords = modified.split(/\s+/);
  const common = lcs(origWords, modWords);
  const maxLen = Math.max(origWords.length, modWords.length);
  return maxLen > 0 ? common.length / maxLen : 0;
}
