import { wordMyersDiff } from "@awa/diff";

/** Mistake categories used for the local "what do I get wrong most" report (Module 12). */
export type MistakeCategory =
  | "spelling"
  | "capitalization"
  | "punctuation"
  | "articles-prepositions"
  | "grammar"
  | "word-choice";

export const MISTAKE_LABELS: Record<MistakeCategory, string> = {
  spelling: "Spelling",
  capitalization: "Capitalization",
  punctuation: "Punctuation",
  "articles-prepositions": "Articles & prepositions",
  grammar: "Grammar (agreement, tense, confusables)",
  "word-choice": "Word choice & phrasing",
};

const FUNCTION_WORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "in",
  "on",
  "at",
  "to",
  "for",
  "with",
  "by",
  "from",
  "into",
  "about",
]);

/** Closed-class words whose swaps are grammar errors (agreement, confusables), not typos. */
const GRAMMAR_WORDS = new Set([
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "am",
  "has",
  "have",
  "had",
  "do",
  "does",
  "did",
  "its",
  "it's",
  "their",
  "there",
  "they're",
  "your",
  "you're",
  "then",
  "than",
  "to",
  "too",
  "two",
  "affect",
  "effect",
  "who",
  "whom",
  "which",
  "that",
  "less",
  "fewer",
  "me",
  "i",
  "he",
  "him",
  "she",
  "her",
  "they",
  "them",
  "we",
  "us",
]);

const stripPunctuation = (word: string): string => word.replace(/[^\p{L}\p{N}']/gu, "");
const isPunctuationOnly = (word: string): boolean =>
  word.length > 0 && stripPunctuation(word) === "";

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = prev[j]!;
      prev[j] = Math.min(above + 1, prev[j - 1]! + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return prev[b.length]!;
}

function classifyReplacement(from: string, to: string): MistakeCategory {
  if (from.toLowerCase() === to.toLowerCase()) return "capitalization";
  if (stripPunctuation(from) === stripPunctuation(to)) return "punctuation";

  const a = stripPunctuation(from).toLowerCase();
  const b = stripPunctuation(to).toLowerCase();
  if (FUNCTION_WORDS.has(a) && FUNCTION_WORDS.has(b)) return "articles-prepositions";
  if (GRAMMAR_WORDS.has(a) || GRAMMAR_WORDS.has(b)) return "grammar";
  if (a.length > 2 && levenshtein(a, b) <= Math.max(2, Math.floor(a.length * 0.34))) {
    return "spelling";
  }
  return "word-choice";
}

function classifyInsertionOrDeletion(words: string[]): MistakeCategory {
  if (words.every(isPunctuationOnly)) return "punctuation";
  if (words.every((w) => FUNCTION_WORDS.has(stripPunctuation(w).toLowerCase()))) {
    return "articles-prepositions";
  }
  return words.length === 1 && GRAMMAR_WORDS.has(stripPunctuation(words[0]!).toLowerCase())
    ? "grammar"
    : "word-choice";
}

/**
 * Classifies each edit hunk between `original` and `modified` (heuristic, English only).
 * Equal-length replace hunks are classified word-by-word; everything else as one hunk.
 */
export function classifyEdits(original: string, modified: string): MistakeCategory[] {
  const ops = wordMyersDiff(original.trim(), modified.trim());
  const result: MistakeCategory[] = [];

  let deleted: string[] = [];
  let inserted: string[] = [];
  const flush = (): void => {
    if (deleted.length && inserted.length) {
      if (deleted.length === inserted.length) {
        deleted.forEach((from, i) => result.push(classifyReplacement(from, inserted[i]!)));
      } else {
        result.push("word-choice");
      }
    } else if (deleted.length) {
      result.push(classifyInsertionOrDeletion(deleted));
    } else if (inserted.length) {
      result.push(classifyInsertionOrDeletion(inserted));
    }
    deleted = [];
    inserted = [];
  };

  for (const op of ops) {
    if (op.type === "equal") flush();
    else if (op.type === "delete") deleted.push(op.text);
    else inserted.push(op.text);
  }
  flush();

  return result;
}

/** Counts categories, e.g. `{ spelling: 2, grammar: 1 }`. */
export function summarizeMistakes(categories: MistakeCategory[]): Record<string, number> {
  return categories.reduce<Record<string, number>>((acc, c) => {
    acc[c] = (acc[c] ?? 0) + 1;
    return acc;
  }, {});
}
