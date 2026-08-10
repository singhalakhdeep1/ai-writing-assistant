import { describe, it, expect } from 'vitest';
import { computeMyersDiff } from '../packages/diff/src/myers-diff';

describe('Myers Diff Engine', () => {
  it('should identify additions and deletions correctly', () => {
    const orig = 'The quick brown fox';
    const updated = 'The fast brown fox';

    const diffs = computeMyersDiff(orig, updated);
    expect(diffs.length).toBeGreaterThan(0);
    expect(diffs.some(d => d.type === 'delete')).toBe(true);
    expect(diffs.some(d => d.type === 'insert')).toBe(true);
  });
});
