import { GRADE_LEVELS } from 'utils/gradeLevels';
import { StudentsByClassSlice } from 'types/dashboard';

/**
 * How a cohort is named on the chart: the grade the way a school says it, then the identifier
 * within it — "5º ano A". Short on purpose; the card puts a dozen of these in a column.
 */
export const classLabel = (slice: StudentsByClassSlice, unassignedLabel: string) => {
  // Students whose cohort left the register belong to nobody until the school moves them.
  if (!slice.school_class_id) {
    return unassignedLabel;
  }

  const grade = GRADE_LEVELS.find((option) => option.value === slice.grade_level);
  const parts = [grade?.label ?? slice.grade_level, slice.name].filter(Boolean);

  return parts.length > 0 ? parts.join(' ') : `#${slice.school_class_id}`;
};
