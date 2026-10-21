import { createContext, useContext } from 'react';
import { Membership } from '../types/auth';
import { GuardianStudent } from '../types/reportCards';

export type GuardianGate =
  | 'idle'
  | 'resolving'
  | 'no_guardian'
  | 'no_child'
  | 'needs_choice'
  | 'ready'
  | 'error';

export interface GuardianContextDraft {
  membership: Membership;
  students: GuardianStudent[];
  loading: boolean;
  empty: boolean;
  error: boolean;
}

export interface GuardianContextValue {
  gate: GuardianGate;
  /** Bumps when the active membership id or student id changes so school-scoped screens drop cached lists. */
  generation: number;
  activeMembership: Membership | null;
  activeStudent: GuardianStudent | null;
  activeSchoolId: number | null;
  activeStudentId: number | null;
  activeStudentName: string | null;
  eligibleMemberships: Membership[];
  /** Linked children of the active school. Empty until a context is ready. */
  linkedStudents: GuardianStudent[];
  draft: GuardianContextDraft | null;
  switching: boolean;
  canSwitch: boolean;
  beginSwitch: () => void;
  cancelSwitch: () => void;
  selectMembership: (membershipId: number) => void;
  selectStudent: (studentId: number) => void;
  backToSchools: () => void;
  retry: () => void;
}

export const GuardianContext = createContext<GuardianContextValue | null>(null);

export const useGuardianContext = () => {
  const context = useContext(GuardianContext);

  if (!context) {
    throw new Error('useGuardianContext must be used within a GuardianContextProvider');
  }

  return context;
};
