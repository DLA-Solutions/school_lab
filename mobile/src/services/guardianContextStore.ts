import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Active guardian context: membership id + student id only.
 *
 * Expo's store-data guide uses AsyncStorage for small preferences that do not
 * need encryption. The refresh token stays in expo-secure-store under
 * `school-lab.auth.refresh-token` (see tokenStore). This key is separate.
 */
const STORAGE_KEY = 'school-lab.guardian.active-context';

export interface StoredGuardianContext {
  membershipId: number;
  studentId: number;
}

let mutationQueue: Promise<void> = Promise.resolve();

const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
  const run = mutationQueue.then(task, task);
  mutationQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
};

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

const parseStoredGuardianContext = (raw: string): StoredGuardianContext | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    if (!isPositiveInteger(record.membershipId) || !isPositiveInteger(record.studentId)) {
      return null;
    }

    return { membershipId: record.membershipId, studentId: record.studentId };
  } catch {
    return null;
  }
};

export const readStoredGuardianContext = (): Promise<StoredGuardianContext | null> =>
  enqueue(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      return parseStoredGuardianContext(raw);
    } catch {
      return null;
    }
  });

/** Writes only when `isCurrent` is still true at the start of this queued turn. */
export const writeStoredGuardianContextIf = (
  value: StoredGuardianContext,
  isCurrent: () => boolean,
): Promise<void> =>
  enqueue(async () => {
    if (!isCurrent()) {
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  });

export const clearStoredGuardianContext = (): Promise<void> =>
  enqueue(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // Logout still drops the in-memory context. A later sign-in revalidates.
    }
  });
