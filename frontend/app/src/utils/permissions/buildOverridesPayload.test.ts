import { describe, expect, it } from 'vitest';
import { buildFormState, buildOverridesPayload } from './buildOverridesPayload';

describe('buildFormState', () => {
  it('maps template and grant states from overrides', () => {
    expect(
      buildFormState(
        ['manage_people', 'manage_enrollment'],
        ['manage_people', 'manage_enrollment', 'manage_billing'],
        ['manage_billing'],
        ['manage_enrollment'],
      ),
    ).toEqual({
      manage_people: 'inherit',
      manage_enrollment: 'deny',
      manage_billing: 'grant',
    });
  });
});

describe('buildOverridesPayload', () => {
  it('serializes dialog state into grants and denies arrays', () => {
    expect(
      buildOverridesPayload(
        {
          manage_people: 'inherit',
          manage_enrollment: 'deny',
          manage_billing: 'grant',
          teach: 'off',
        },
        ['manage_people', 'manage_enrollment'],
      ),
    ).toEqual({
      grants: ['manage_billing'],
      denies: ['manage_enrollment'],
    });
  });
});
