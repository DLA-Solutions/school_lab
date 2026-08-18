import { describe, expect, it } from 'vitest';
import { buildExpiringCredentialAlerts, isExpiringWithinDays } from 'utils/ops/expiringCredentials';
import { sampleBankCredential } from 'test/msw/handlers';

describe('expiringCredentials ops utils', () => {
  it('detects credentials expiring within the window', () => {
    const reference = new Date('2026-08-01T12:00:00Z');
    const soon = '2026-08-20T12:00:00Z';
    const later = '2027-01-01T12:00:00Z';

    expect(isExpiringWithinDays(soon, 30, reference)).toBe(true);
    expect(isExpiringWithinDays(later, 30, reference)).toBe(false);
  });

  it('builds expiring credential alerts', () => {
    const reference = new Date('2026-08-01T12:00:00Z');
    const credential = {
      ...sampleBankCredential(1, 'client-expiring'),
      certificate_expires_at: '2026-08-15T12:00:00Z',
    };

    const alerts = buildExpiringCredentialAlerts(
      [{ id: 1, name: 'Escola Alpha' }],
      { 1: [credential] },
      30,
      reference,
    );

    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.schoolName).toBe('Escola Alpha');
    expect(alerts[0]?.daysRemaining).toBe(14);
  });
});
