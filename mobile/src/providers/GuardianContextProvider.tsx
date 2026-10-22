import { PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthUser, Membership } from '../types/auth';
import { GuardianStudent } from '../types/reportCards';
import { fetchGuardianStudents } from '../services/reportCards';
import {
  clearStoredGuardianContext,
  readStoredGuardianContext,
  writeStoredGuardianContextIf,
} from '../services/guardianContextStore';
import { setRoutineChildBridge } from '../services/routineChildSwitch';
import { useAuth } from './AuthContext';
import {
  GuardianContext,
  GuardianContextDraft,
  GuardianGate,
} from './GuardianContext';

interface ActiveSelection {
  membership: Membership;
  student: GuardianStudent;
  students: GuardianStudent[];
}

type Resolution =
  | { type: 'no_guardian'; eligible: Membership[] }
  | { type: 'no_child'; eligible: Membership[] }
  | { type: 'error'; eligible: Membership[] }
  | { type: 'ready'; eligible: Membership[]; active: ActiveSelection }
  | { type: 'needs_choice'; eligible: Membership[]; draft: GuardianContextDraft | null };

const eligibleGuardianMemberships = (memberships: Membership[]): Membership[] =>
  memberships.filter((membership) => membership.status === 'active' && membership.role === 'guardian');

const loadStudents = async (schoolId: number): Promise<GuardianStudent[]> => {
  const response = await fetchGuardianStudents(schoolId);
  return response.data;
};

const childDraft = (membership: Membership, students: GuardianStudent[]): GuardianContextDraft => ({
  membership,
  students,
  loading: false,
  empty: students.length === 0,
  error: false,
});

/**
 * Picks a context only when exactly one active guardian membership has exactly one child.
 * Every other shape waits for an explicit membership id and student id.
 */
const resolveFresh = async (
  eligible: Membership[],
  isCurrent: () => boolean,
): Promise<Resolution | null> => {
  if (eligible.length !== 1) {
    return { type: 'needs_choice', eligible, draft: null };
  }

  const membership = eligible[0];
  if (!membership) {
    return { type: 'no_guardian', eligible: [] };
  }

  try {
    const students = await loadStudents(membership.school_id);
    if (!isCurrent()) {
      return null;
    }

    if (students.length === 0) {
      return { type: 'no_child', eligible };
    }

    const onlyStudent = students.length === 1 ? students[0] : undefined;
    if (onlyStudent) {
      await writeStoredGuardianContextIf(
        { membershipId: membership.id, studentId: onlyStudent.id },
        isCurrent,
      );
      if (!isCurrent()) {
        return null;
      }
      return { type: 'ready', eligible, active: { membership, student: onlyStudent, students } };
    }

    return { type: 'needs_choice', eligible, draft: childDraft(membership, students) };
  } catch {
    if (!isCurrent()) {
      return null;
    }
    return { type: 'error', eligible };
  }
};

const resolveActiveContext = async (
  memberships: Membership[],
  isCurrent: () => boolean,
): Promise<Resolution | null> => {
  const eligible = eligibleGuardianMemberships(memberships);
  if (eligible.length === 0) {
    await clearStoredGuardianContext();
    if (!isCurrent()) {
      return null;
    }
    return { type: 'no_guardian', eligible };
  }

  const stored = await readStoredGuardianContext();
  if (!isCurrent()) {
    return null;
  }

  if (!stored) {
    return resolveFresh(eligible, isCurrent);
  }

  const membership = eligible.find((item) => item.id === stored.membershipId);
  if (!membership) {
    await clearStoredGuardianContext();
    if (!isCurrent()) {
      return null;
    }
    return resolveFresh(eligible, isCurrent);
  }

  try {
    const students = await loadStudents(membership.school_id);
    if (!isCurrent()) {
      return null;
    }

    const student = students.find((item) => item.id === stored.studentId);
    if (student) {
      return { type: 'ready', eligible, active: { membership, student, students } };
    }

    const onlyStudent = students.length === 1 ? students[0] : undefined;
    if (onlyStudent) {
      await writeStoredGuardianContextIf(
        { membershipId: membership.id, studentId: onlyStudent.id },
        isCurrent,
      );
      if (!isCurrent()) {
        return null;
      }
      return { type: 'ready', eligible, active: { membership, student: onlyStudent, students } };
    }

    await clearStoredGuardianContext();
    if (!isCurrent()) {
      return null;
    }

    if (students.length === 0) {
      if (eligible.length === 1) {
        return { type: 'no_child', eligible };
      }
      return { type: 'needs_choice', eligible, draft: childDraft(membership, students) };
    }

    return { type: 'needs_choice', eligible, draft: childDraft(membership, students) };
  } catch {
    if (!isCurrent()) {
      return null;
    }
    return { type: 'error', eligible };
  }
};

const GuardianContextProvider = ({ children }: PropsWithChildren) => {
  const { user, status } = useAuth();
  const [gate, setGate] = useState<GuardianGate>('idle');
  const [generation, setGeneration] = useState(0);
  const [active, setActive] = useState<ActiveSelection | null>(null);
  const [eligible, setEligible] = useState<Membership[]>([]);
  const [draft, setDraft] = useState<GuardianContextDraft | null>(null);
  const [switching, setSwitching] = useState(false);

  const epoch = useRef(0);
  const draftEpoch = useRef(0);
  const commitRef = useRef(false);
  const activeRef = useRef(active);
  const eligibleRef = useRef(eligible);
  const switchingRef = useRef(switching);
  const userRef = useRef(user);
  activeRef.current = active;
  eligibleRef.current = eligible;
  switchingRef.current = switching;
  userRef.current = user;

  const applyResolution = useCallback((resolution: Resolution) => {
    setEligible(resolution.eligible);

    if (resolution.type === 'ready') {
      const previous = activeRef.current;
      const next = resolution.active;
      const changed =
        previous !== null &&
        (previous.membership.id !== next.membership.id || previous.student.id !== next.student.id);
      if (changed) {
        setGeneration((current) => current + 1);
      }
      setActive(next);
      setDraft(null);
      setSwitching(false);
      setGate('ready');
      return;
    }

    setActive(null);
    setSwitching(false);

    if (resolution.type === 'no_guardian') {
      setDraft(null);
      setGate('no_guardian');
      return;
    }
    if (resolution.type === 'no_child') {
      setDraft(null);
      setGate('no_child');
      return;
    }
    if (resolution.type === 'error') {
      setDraft(null);
      setGate('error');
      return;
    }

    setDraft(resolution.draft);
    setGate('needs_choice');
  }, []);

  useEffect(() => {
    if (status === 'loading') {
      setGate('resolving');
      return;
    }

    if (status === 'unauthenticated') {
      epoch.current += 1;
      draftEpoch.current += 1;
      commitRef.current = false;
      void clearStoredGuardianContext();
      setGate('idle');
      setActive(null);
      setEligible([]);
      setDraft(null);
      setSwitching(false);
      setGeneration(0);
      return;
    }

    if (!user) {
      setGate('resolving');
      return;
    }

    const token = ++epoch.current;
    const isCurrent = () => epoch.current === token;
    setGate('resolving');
    setDraft(null);
    setSwitching(false);

    void resolveActiveContext(user.memberships, isCurrent).then((resolution) => {
      if (!resolution || !isCurrent()) {
        return;
      }
      applyResolution(resolution);
    });
  }, [status, user, applyResolution]);

  const beginSwitch = useCallback(() => {
    const current = activeRef.current;
    const options = eligibleRef.current;
    if (!current) {
      return;
    }
    if (options.length <= 1 && current.students.length <= 1) {
      return;
    }

    draftEpoch.current += 1;
    setSwitching(true);
    if (options.length > 1) {
      setDraft(null);
    } else {
      setDraft(childDraft(current.membership, current.students));
    }
    setGate('needs_choice');
  }, []);

  const cancelSwitch = useCallback(() => {
    if (!switchingRef.current || !activeRef.current || commitRef.current) {
      return;
    }
    draftEpoch.current += 1;
    setDraft(null);
    setSwitching(false);
    setGate('ready');
  }, []);

  const backToSchools = useCallback(() => {
    if (commitRef.current || eligibleRef.current.length <= 1) {
      return;
    }
    draftEpoch.current += 1;
    setDraft(null);
  }, []);

  const selectMembership = useCallback((membershipId: number) => {
    if (commitRef.current) {
      return;
    }
    const membership = eligibleRef.current.find((item) => item.id === membershipId);
    if (!membership) {
      return;
    }

    const token = ++draftEpoch.current;
    const session = epoch.current;
    setDraft({ membership, students: [], loading: true, empty: false, error: false });

    void loadStudents(membership.school_id)
      .then((students) => {
        if (draftEpoch.current !== token || epoch.current !== session) {
          return;
        }
        // One child still needs an explicit tap. Do not persist from here.
        setDraft(childDraft(membership, students));
      })
      .catch(() => {
        if (draftEpoch.current !== token || epoch.current !== session) {
          return;
        }
        setDraft({ membership, students: [], loading: false, empty: false, error: true });
      });
  }, []);

  const selectStudent = useCallback((studentId: number) => {
    if (commitRef.current) {
      return;
    }
    const currentDraft = draft;
    if (!currentDraft || currentDraft.loading || currentDraft.error) {
      return;
    }
    const student = currentDraft.students.find((item) => item.id === studentId);
    if (!student) {
      return;
    }

    const session = epoch.current;
    const isCurrent = () => epoch.current === session;
    commitRef.current = true;

    void writeStoredGuardianContextIf(
      { membershipId: currentDraft.membership.id, studentId: student.id },
      isCurrent,
    )
      .then(() => {
        if (!isCurrent()) {
          return;
        }
        const previous = activeRef.current;
        const changed =
          previous !== null &&
          (previous.membership.id !== currentDraft.membership.id || previous.student.id !== student.id);
        if (changed) {
          setGeneration((current) => current + 1);
        }
        setActive({
          membership: currentDraft.membership,
          student,
          students: currentDraft.students,
        });
        setDraft(null);
        setSwitching(false);
        setGate('ready');
      })
      .catch(() => {
        if (!isCurrent()) {
          return;
        }
        setDraft({ ...currentDraft, error: true });
      })
      .finally(() => {
        commitRef.current = false;
      });
  }, [draft]);

  /**
   * Switches the active child from a routine notification. Only a student already in
   * `active.students` (this guardian membership) is eligible. The picker draft is not used.
   */
  const activateLinkedStudent = useCallback((studentId: number): Promise<boolean> => {
    const current = activeRef.current;
    if (!current || commitRef.current) {
      return Promise.resolve(false);
    }

    const student = current.students.find((item) => item.id === studentId);
    if (!student) {
      return Promise.resolve(false);
    }
    if (current.student.id === studentId) {
      return Promise.resolve(true);
    }

    const session = epoch.current;
    const isCurrent = () => epoch.current === session;
    commitRef.current = true;

    return writeStoredGuardianContextIf(
      { membershipId: current.membership.id, studentId: student.id },
      isCurrent,
    )
      .then(() => {
        if (!isCurrent()) {
          return false;
        }
        const previous = activeRef.current;
        const changed =
          previous !== null &&
          (previous.membership.id !== current.membership.id || previous.student.id !== student.id);
        if (changed) {
          setGeneration((value) => value + 1);
        }
        setActive({
          membership: current.membership,
          student,
          students: current.students,
        });
        setDraft(null);
        setSwitching(false);
        setGate('ready');
        return true;
      })
      .catch(() => false)
      .finally(() => {
        commitRef.current = false;
      });
  }, []);

  setRoutineChildBridge({
    activeStudentId: active?.student.id ?? null,
    linkedStudentIds: (active?.students ?? []).map((student) => student.id),
    activateLinkedStudent,
  });

  useEffect(() => () => setRoutineChildBridge(null), []);

  const retry = useCallback(() => {
    const currentUser: AuthUser | null = userRef.current;
    if (!currentUser || status !== 'authenticated') {
      return;
    }
    const token = ++epoch.current;
    const isCurrent = () => epoch.current === token;
    setGate('resolving');
    void resolveActiveContext(currentUser.memberships, isCurrent).then((resolution) => {
      if (!resolution || !isCurrent()) {
        return;
      }
      applyResolution(resolution);
    });
  }, [status, applyResolution]);

  const canSwitch =
    gate === 'ready' &&
    active !== null &&
    (eligible.length > 1 || active.students.length > 1);

  const value = useMemo(
    () => ({
      gate,
      generation,
      activeMembership: active?.membership ?? null,
      activeStudent: active?.student ?? null,
      activeSchoolId: active?.membership.school_id ?? null,
      activeStudentId: active?.student.id ?? null,
      activeStudentName: active?.student.name ?? null,
      eligibleMemberships: eligible,
      linkedStudents: active?.students ?? [],
      draft,
      switching,
      canSwitch,
      beginSwitch,
      cancelSwitch,
      selectMembership,
      selectStudent,
      backToSchools,
      retry,
    }),
    [
      gate,
      generation,
      active,
      eligible,
      draft,
      switching,
      canSwitch,
      beginSwitch,
      cancelSwitch,
      selectMembership,
      selectStudent,
      backToSchools,
      retry,
    ],
  );

  return <GuardianContext.Provider value={value}>{children}</GuardianContext.Provider>;
};

export default GuardianContextProvider;
