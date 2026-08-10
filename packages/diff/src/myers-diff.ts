export interface DiffOp {
  type: 'insert' | 'delete' | 'equal';
  value: string;
}

export function computeMyersDiff(originalText: string, updatedText: string): DiffOp[] {
  if (originalText === updatedText) {
    return [{ type: 'equal', value: originalText }];
  }

  const origWords = originalText.split(/\s+/);
  const newWords = updatedText.split(/\s+/);
  const result: DiffOp[] = [];

  let i = 0;
  let j = 0;

  while (i < origWords.length || j < newWords.length) {
    if (i < origWords.length && j < newWords.length && origWords[i] === newWords[j]) {
      result.push({ type: 'equal', value: origWords[i] + ' ' });
      i++;
      j++;
    } else if (j < newWords.length && (!origWords[i] || origWords[i] !== newWords[j])) {
      result.push({ type: 'insert', value: newWords[j] + ' ' });
      j++;
    } else if (i < origWords.length) {
      result.push({ type: 'delete', value: origWords[i] + ' ' });
      i++;
    }
  }

  return result;
}
