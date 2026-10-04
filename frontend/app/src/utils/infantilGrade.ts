/** `SchoolClass::GRADE_LEVELS` infantil_1 … infantil_5. */
export const isInfantilGrade = (gradeLevel: string | null | undefined) =>
  typeof gradeLevel === 'string' && /^infantil_[1-5]$/.test(gradeLevel);
