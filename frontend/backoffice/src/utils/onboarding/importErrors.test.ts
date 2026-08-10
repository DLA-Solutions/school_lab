import { describe, expect, it } from 'vitest';
import { formatImportErrorReport } from 'utils/onboarding/importErrors';

describe('formatImportErrorReport', () => {
  it('flattens file and row errors', () => {
    expect(
      formatImportErrorReport({
        file: ['Arquivo obrigatório.'],
        rows: [{ row: 2, errors: { student_name: ['não pode ficar em branco'] } }],
      }),
    ).toEqual([
      'Arquivo obrigatório.',
      'Linha 2, student_name: não pode ficar em branco',
    ]);
  });

  it('returns empty list when report is undefined', () => {
    expect(formatImportErrorReport(undefined)).toEqual([]);
  });
});
