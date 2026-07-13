import type { AnalyticsSnapshot } from "@awa/types";

const STORAGE_KEY = "awa:analytics";

/** Reading level metrics */
export interface ReadingLevelMetrics {
  fleschKincaidGrade: number;
  fleschReadingEase: number;
  gunningFogIndex: number;
  colemanLiauIndex: number;
  automatedReadabilityIndex: number;
  averageSentenceLength: number;
  averageSyllablesPerWord: number;
  complexWords: number;
  totalWords: number;
  totalSentences: number;
  totalSyllables: number;
}

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

/**
 * Calculate reading level metrics for text
 * Uses multiple readability formulas for comprehensive analysis
 */
export function calculateReadingLevel(text: string): ReadingLevelMetrics {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const syllables = words.map(w => countSyllables(w));

  const totalWords = words.length;
  const totalSentences = sentences.length || 1;
  const totalSyllables = syllables.reduce((sum, s) => sum + s, 0);
  const averageSentenceLength = totalWords / totalSentences;
  const averageSyllablesPerWord = totalSyllables / totalWords || 0;

  // Count complex words (3+ syllables, excluding common suffixes)
  const complexWords = words.filter(w => {
    const s = countSyllables(w);
    return s >= 3 && !w.toLowerCase().endsWith('ing') && 
           !w.toLowerCase().endsWith('ed') && !w.toLowerCase().endsWith('es');
  }).length;

  // Flesch-Kincaid Grade Level
  const fleschKincaidGrade = 0.39 * averageSentenceLength + 11.8 * averageSyllablesPerWord - 15.59;

  // Flesch Reading Ease
  const fleschReadingEase = 206.835 - 1.015 * averageSentenceLength - 84.6 * averageSyllablesPerWord;

  // Gunning Fog Index
  const gunningFogIndex = 0.4 * (averageSentenceLength + 100 * (complexWords / totalWords));

  // Coleman-Liau Index
  const avgLettersPerWord = words.reduce((sum, w) => sum + w.replace(/[^a-z]/gi, '').length, 0) / totalWords;
  const colemanLiauIndex = 0.0588 * avgLettersPerWord * 100 - 0.296 * (totalSentences / totalWords) * 100 - 15.8;

  // Automated Readability Index
  const avgCharsPerWord = words.reduce((sum, w) => sum + w.length, 0) / totalWords;
  const automatedReadabilityIndex = 4.71 * avgCharsPerWord + 0.5 * averageSentenceLength - 21.43;

  return {
    fleschKincaidGrade: Math.max(0, fleschKincaidGrade),
    fleschReadingEase: Math.max(0, Math.min(100, fleschReadingEase)),
    gunningFogIndex: Math.max(0, gunningFogIndex),
    colemanLiauIndex: Math.max(0, colemanLiauIndex),
    automatedReadabilityIndex: Math.max(0, automatedReadabilityIndex),
    averageSentenceLength,
    averageSyllablesPerWord,
    complexWords,
    totalWords,
    totalSentences,
    totalSyllables,
  };
}

/**
 * Count syllables in a word
 * Uses heuristic approach for English
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;

  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

/**
 * Get reading level description
 */
export function getReadingLevelDescription(metrics: ReadingLevelMetrics): {
  grade: string;
  ease: string;
  audience: string;
} {
  const grade = metrics.fleschKincaidGrade;
  const ease = metrics.fleschReadingEase;

  let gradeLevel = '';
  let easeLevel = '';
  let audience = '';

  if (grade <= 6) {
    gradeLevel = 'Elementary School (K-6)';
    audience = 'General audience, children';
  } else if (grade <= 8) {
    gradeLevel = 'Middle School (7-8)';
    audience = 'General audience';
  } else if (grade <= 12) {
    gradeLevel = 'High School (9-12)';
    audience = 'General adult audience';
  } else if (grade <= 14) {
    gradeLevel = 'College (13-14)';
    audience = 'College-educated adults';
  } else {
    gradeLevel = 'Graduate Level (15+)';
    audience = 'Specialized/academic audience';
  }

  if (ease >= 90) {
    easeLevel = 'Very Easy';
  } else if (ease >= 80) {
    easeLevel = 'Easy';
  } else if (ease >= 70) {
    easeLevel = 'Fairly Easy';
  } else if (ease >= 60) {
    easeLevel = 'Standard';
  } else if (ease >= 50) {
    easeLevel = 'Fairly Difficult';
  } else if (ease >= 30) {
    easeLevel = 'Difficult';
  } else {
    easeLevel = 'Very Difficult';
  }

  return {
    grade: gradeLevel,
    ease: easeLevel,
    audience,
  };
}

/**
 * Compare reading levels between original and modified text
 */
export function compareReadingLevels(original: string, modified: string): {
  original: ReadingLevelMetrics;
  modified: ReadingLevelMetrics;
  improvement: {
    gradeChange: number;
    easeChange: number;
    simplified: boolean;
  };
} {
  const originalMetrics = calculateReadingLevel(original);
  const modifiedMetrics = calculateReadingLevel(modified);

  const gradeChange = originalMetrics.fleschKincaidGrade - modifiedMetrics.fleschKincaidGrade;
  const easeChange = modifiedMetrics.fleschReadingEase - originalMetrics.fleschReadingEase;
  const simplified = gradeChange > 0 || easeChange > 0;

  return {
    original: originalMetrics,
    modified: modifiedMetrics,
    improvement: {
      gradeChange,
      easeChange,
      simplified,
    },
  };
}
