import { describe, expect, it } from 'vitest';
import { deriveDenies, deriveGrants, deriveOverrides } from './deriveOverrides';

describe('deriveGrants', () => {
  it('returns keys whose source is grant', () => {
    expect(
      deriveGrants({
        manage_people: 'template',
        manage_billing: 'grant',
      }),
    ).toEqual(['manage_billing']);
  });
});

describe('deriveDenies', () => {
  it('returns template keys missing from the effective permission set', () => {
    expect(
      deriveDenies(
        ['manage_people', 'manage_enrollment', 'manage_documents'],
        ['manage_people', 'manage_documents'],
      ),
    ).toEqual(['manage_enrollment']);
  });
});

describe('deriveOverrides', () => {
  it('combines grants and denies for PATCH round-trips', () => {
    expect(
      deriveOverrides(
        { manage_people: 'template', manage_billing: 'grant' },
        ['manage_people', 'manage_enrollment'],
        ['manage_people', 'manage_billing'],
      ),
    ).toEqual({
      grants: ['manage_billing'],
      denies: ['manage_enrollment'],
    });
  });
});
