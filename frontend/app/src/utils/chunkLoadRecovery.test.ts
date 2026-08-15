import { describe, expect, it } from 'vitest';
import { isChunkLoadError } from './chunkLoadRecovery';

describe('isChunkLoadError', () => {
  it('detects Vite dynamic import failures', () => {
    expect(
      isChunkLoadError(
        new Error('Failed to fetch dynamically imported module: https://example.com/assets/Subjects.js'),
      ),
    ).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isChunkLoadError(new Error('Network request failed'))).toBe(false);
    expect(isChunkLoadError('not an error')).toBe(false);
  });
});
