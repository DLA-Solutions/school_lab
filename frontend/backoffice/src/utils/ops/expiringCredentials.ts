import { SchoolPaymentProvider } from 'types/bankCredential';

export const CREDENTIAL_EXPIRY_WINDOW_DAYS = 30;

export type ExpiringCredentialAlert = {
  schoolId: number;
  schoolName: string;
  credential: SchoolPaymentProvider;
  daysRemaining: number;
};

const msPerDay = 24 * 60 * 60 * 1000;

export const daysUntil = (isoDate: string, reference = new Date()): number => {
  const target = new Date(isoDate).getTime();
  const now = reference.getTime();

  return Math.ceil((target - now) / msPerDay);
};

export const isExpiringWithinDays = (
  isoDate: string,
  windowDays: number,
  reference = new Date(),
): boolean => {
  const remaining = daysUntil(isoDate, reference);

  return remaining >= 0 && remaining <= windowDays;
};

export const buildExpiringCredentialAlerts = (
  schools: Array<{ id: number; name: string }>,
  credentialsBySchool: Record<number, SchoolPaymentProvider[]>,
  windowDays = CREDENTIAL_EXPIRY_WINDOW_DAYS,
  reference = new Date(),
): ExpiringCredentialAlert[] =>
  schools.flatMap((school) => {
    const credentials = credentialsBySchool[school.id] ?? [];
    const active = credentials.find((entry) => entry.active);

    if (!active || !isExpiringWithinDays(active.certificate_expires_at, windowDays, reference)) {
      return [];
    }

    return [
      {
        schoolId: school.id,
        schoolName: school.name,
        credential: active,
        daysRemaining: daysUntil(active.certificate_expires_at, reference),
      },
    ];
  });
