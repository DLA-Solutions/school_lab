import { describe, expect, it } from 'vitest';
import { buildReturnToPath } from 'utils/auth/signIn';

describe('buildReturnToPath', () => {
  it('prefixes the Vite basename for backoffice routes', () => {
    expect(buildReturnToPath('/', '', '', '/backoffice')).toBe('/backoffice/');
    expect(buildReturnToPath('/schools', '?page=2', '#top', '/backoffice')).toBe(
      '/backoffice/schools?page=2#top',
    );
  });

  it('keeps the path unchanged when there is no basename', () => {
    expect(buildReturnToPath('/schools', '', '', '')).toBe('/schools');
    expect(buildReturnToPath('/', '', '', '/')).toBe('/');
  });
});
