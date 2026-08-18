import { describe, expect, it } from 'vitest';
import { buildDisabledModuleAlerts, disabledModuleKeys } from 'utils/ops/disabledModules';

describe('disabledModules ops utils', () => {
  it('lists disabled module keys', () => {
    expect(
      disabledModuleKeys({
        communication: true,
        academic: false,
        billing: false,
        documents: true,
      }),
    ).toEqual(['academic', 'billing']);
  });

  it('builds alerts for schools with disabled modules', () => {
    const alerts = buildDisabledModuleAlerts(
      [
        { id: 1, name: 'Escola Alpha' },
        { id: 2, name: 'Escola Beta' },
      ],
      {
        1: { communication: true, academic: true, billing: true, documents: true },
        2: { communication: true, academic: true, billing: false, documents: true },
      },
    );

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      schoolId: 2,
      schoolName: 'Escola Beta',
      disabledModules: ['billing'],
    });
  });
});
