/** Sentence-level diff result (Module 7). */
export interface SentenceDiff {
  original: string;
  modified: string;
  changed: boolean;
}

/** Diff operation types for Myers/LCS algorithm */
export interface DiffOperation {
  type: 'insert' | 'delete' | 'equal';
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
export function wordDiff(original: string, modified: string): { added: string[]; removed: string[] } {
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

  // Edge cases
  if (m === 0) {
    return modified.map(text => ({ type: 'insert' as const, text: String(text) }));
  }
  if (n === 0) {
    return original.map(text => ({ type: 'delete' as const, text: String(text) }));
  }

  const max = m + n;
  const v: Record<number, number> = { 1: 0 };
  const trace: number[][] = [];

  for (let d = 0; d <= max; d++) {
    trace.push([...Object.values(v)]);

    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[k - 1] < v[k + 1])) {
        x = v[k + 1];
      } else {
        x = v[k - 1] + 1;
      }

      let y = x - k;

      while (x < m && y < n && original[x] === modified[y]) {
        x++;
        y++;
      }

      v[k] = x;

      if (x === m && y === n) {
        return backtrack(trace, original, modified);
      }
    }
  }

  return [];
}

/**
 * Backtrack through the trace to produce the diff operations
 */
function backtrack<T>(trace: number[][], original: T[], modified: T[]): DiffOperation[] {
  const m = original.length;
  const n = modified.length;
  const operations: DiffOperation[] = [];
  
  let x = m;
  let y = n;

  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d];
    const k = x - y;

    let prevK: number;
    if (k === -d || (k !== d && v[k - 1] < v[k + 1])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }

    const prevX = v[prevK];
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      operations.unshift({ type: 'equal', text: String(original[x - 1]) });
      x--;
      y--;
    }

    if (x > prevX) {
      operations.unshift({ type: 'delete', text: String(original[x - 1]) });
      x--;
    } else if (y > prevY) {
      operations.unshift({ type: 'insert', text: String(modified[y - 1]) });
      y--;
    }
  }

  return operations;
}

/**
 * Longest Common Subsequence (LCS) using dynamic programming
 * Returns the LCS between two sequences
 */
export function lcs<T>(seq1: T[], seq2: T[]): T[] {
  const m = seq1.length;
  const n = seq2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  // Build DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (seq1[i - 1] === seq2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find LCS
  const lcs: T[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (seq1[i - 1] === seq2[j - 1]) {
      lcs.unshift(seq1[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

/**
 * Character-level Myers diff for fine-grained text comparison
 */
export function charDiff(original: string, modified: string): DiffOperation[] {
  const origChars = original.split('');
  const modChars = modified.split('');
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
