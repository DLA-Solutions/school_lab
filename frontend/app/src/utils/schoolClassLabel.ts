import { MessageKey } from 'locales';
import { SchoolClassShift } from 'types/academics';
import { gradeLevelLabel } from './gradeLevels';

/** Narrowed to the keys this helper looks up, so any `t` from `useTranslation` is accepted. */
type TranslateShift = (key: Extract<MessageKey, `common.shift.${string}`>) => string;

/** The parts of a cohort that name it. Widened so a `TeacherClass` can be labelled too. */
interface LabellableSchoolClass {
  name: string;
  grade_level: string;
  shift: SchoolClassShift;
  year: number;
}

/**
 * "Ensino Fundamental I — 5º ano A · Matutino — 2026".
 *
 * The shift belongs in the name rather than beside it: a grade and a letter no longer identify a
 * cohort on their own, so a picker that leaves the shift out offers the same option twice.
 */
export const schoolClassLabel = (schoolClass: LabellableSchoolClass, t: TranslateShift) =>
  `${gradeLevelLabel(schoolClass.grade_level)} ${schoolClass.name} · ` +
  `${t(`common.shift.${schoolClass.shift}`)} — ${schoolClass.year}`;

export default schoolClassLabel;
