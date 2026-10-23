export interface RoutineChildBridge {
  activeStudentId: number | null;
  linkedStudentIds: readonly number[];
  activateLinkedStudent: (studentId: number) => Promise<boolean>;
}

let bridge: RoutineChildBridge | null = null;

/** Latest active child, registered from `GuardianContextProvider` before tab effects run. */
export const setRoutineChildBridge = (next: RoutineChildBridge | null): void => {
  bridge = next;
};

export const routineChildSnapshot = (): {
  activeStudentId: number | null;
  linkedStudentIds: readonly number[];
} => ({
  activeStudentId: bridge?.activeStudentId ?? null,
  linkedStudentIds: bridge?.linkedStudentIds ?? [],
});

/** Switches only a child already linked to the active guardian membership. */
export const switchRoutineChild = (studentId: number): Promise<boolean> => {
  const activate = bridge?.activateLinkedStudent;
  if (!activate) {
    return Promise.resolve(false);
  }
  return activate(studentId);
};
