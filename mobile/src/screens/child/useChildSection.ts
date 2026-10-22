import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useGuardianContext } from '../../providers/GuardianContext';
import { ApiError } from '../../services/api';
import { SectionFailure } from '../../utils/sectionFailure';

export type SectionPhase = 'loading' | 'ready' | 'empty' | 'not_found' | 'error' | 'offline';

export type SectionReloadKind = 'focus' | 'refresh';

export interface ChildSectionHandle {
  reload: (kind: SectionReloadKind) => Promise<void>;
}

/**
 * One Filho section. Clears cached rows when generation, school, or student changes,
 * ignores a response that belongs to an older request, and refetches while the tab is focused.
 * A failure here does not touch any other section's state.
 */
export const useChildSection = <T,>(
  load: (schoolId: number, studentId: number) => Promise<T[]>,
): {
  phase: SectionPhase;
  rows: T[];
  reload: (kind: SectionReloadKind) => Promise<void>;
} => {
  const { activeSchoolId, activeStudentId, generation } = useGuardianContext();
  const [phase, setPhase] = useState<SectionPhase>('loading');
  const [rows, setRows] = useState<T[]>([]);
  const requestSeq = useRef(0);

  const contextKey = `${generation}:${activeSchoolId ?? ''}:${activeStudentId ?? ''}`;
  const contextKeyRef = useRef(contextKey);
  contextKeyRef.current = contextKey;
  const [seenContextKey, setSeenContextKey] = useState(contextKey);
  if (seenContextKey !== contextKey) {
    setSeenContextKey(contextKey);
    setRows([]);
    setPhase('loading');
  }

  const reload = useCallback(
    async (kind: SectionReloadKind) => {
      const schoolId = activeSchoolId;
      const studentId = activeStudentId;
      const requestContext = `${generation}:${schoolId ?? ''}:${studentId ?? ''}`;
      const seq = ++requestSeq.current;

      if (schoolId == null || studentId == null) {
        if (contextKeyRef.current === requestContext && requestSeq.current === seq) {
          setRows([]);
          setPhase('empty');
        }
        return;
      }

      if (kind === 'focus') {
        setRows([]);
        setPhase('loading');
      }

      const apply = (nextPhase: SectionPhase, nextRows: T[]) => {
        if (requestSeq.current !== seq || contextKeyRef.current !== requestContext) {
          return;
        }
        setRows(nextRows);
        setPhase(nextPhase);
      };

      try {
        const nextRows = await load(schoolId, studentId);
        if (!Array.isArray(nextRows)) {
          apply('error', []);
          return;
        }
        apply(nextRows.length === 0 ? 'empty' : 'ready', nextRows);
      } catch (err) {
        if (err instanceof SectionFailure) {
          apply(err.phase, []);
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          apply('not_found', []);
          return;
        }
        if (err instanceof ApiError) {
          apply('error', []);
          return;
        }
        apply('offline', []);
      }
    },
    [activeSchoolId, activeStudentId, generation, load],
  );

  useFocusEffect(
    useCallback(() => {
      void reload('focus');

      return () => {
        requestSeq.current += 1;
      };
    }, [reload]),
  );

  return { phase, rows, reload };
};
