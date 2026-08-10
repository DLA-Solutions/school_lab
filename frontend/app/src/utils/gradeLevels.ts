/**
 * The grades a school enrols into, in teaching order.
 *
 * The keys mirror `SchoolClass::GRADE_LEVELS` (`web/app/models/school_class.rb`), which validates
 * them — a value missing here still saves, it just shows as its raw key. Fundamental I covers the 1st to
 * 5th years and Fundamental II the 6th to 9th, so no school year appears under two segments.
 */
export interface GradeLevelOption {
  value: string;
  label: string;
  segment: string;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

export const GRADE_LEVELS: GradeLevelOption[] = [
  ...ROMAN.map((numeral, index) => ({
    value: `infantil_${index + 1}`,
    label: `Infantil ${numeral}`,
    segment: 'Educação Infantil',
  })),
  ...[1, 2, 3, 4, 5].map((year) => ({
    value: `fundamental_i_${year}`,
    label: `${year}º ano`,
    segment: 'Ensino Fundamental I',
  })),
  ...[6, 7, 8, 9].map((year) => ({
    value: `fundamental_ii_${year}`,
    label: `${year}º ano`,
    segment: 'Ensino Fundamental II',
  })),
];

/** "fundamental_i_5" → "Ensino Fundamental I — 5º ano". */
export const gradeLevelLabel = (value: string | null | undefined) => {
  const grade = GRADE_LEVELS.find((option) => option.value === value);

  return grade ? `${grade.segment} — ${grade.label}` : (value ?? '—');
};

/** The segments in teaching order, for grouping the select. */
export const GRADE_SEGMENTS = [...new Set(GRADE_LEVELS.map((grade) => grade.segment))];
