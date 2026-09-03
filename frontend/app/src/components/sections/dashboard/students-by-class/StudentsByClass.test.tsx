import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithTheme } from 'test/renderWithTheme';
import { DashboardMetrics, StudentsByClassSlice } from 'types/dashboard';
import StudentsByClass from './StudentsByClass';

const slice = (overrides: Partial<StudentsByClassSlice>): StudentsByClassSlice => ({
  school_class_id: 1,
  name: 'A',
  grade_level: 'fundamental_i_1',
  year: 2026,
  students: 1,
  ...overrides,
});

const metricsWith = (students_by_class: StudentsByClassSlice[]): DashboardMetrics => ({
  month: '2026-09',
  students_by_class,
});

describe('StudentsByClass', () => {
  it('shows the empty state when there is nobody enrolled', () => {
    renderWithTheme(<StudentsByClass metrics={metricsWith([])} loading={false} />);

    expect(screen.getByText('Nenhum aluno matriculado')).toBeInTheDocument();
  });

  it('labels a class with no cohort as unassigned', () => {
    const metrics = metricsWith([
      slice({ school_class_id: null, name: null, grade_level: null, students: 2 }),
    ]);

    renderWithTheme(<StudentsByClass metrics={metrics} loading={false} />);

    expect(screen.getByText('Sem turma')).toBeInTheDocument();
  });

  // The regression this guards: with many cohorts, only the first few fit the fixed-height
  // legend without scrolling — every one of them still has to be in the document (reachable by
  // scrolling), or the percentages on screen stop adding up to the ring's own total.
  it('keeps every cohort in the list even past what the fixed-height legend shows at once', () => {
    const slices = Array.from({ length: 12 }, (_, index) =>
      slice({ school_class_id: index + 1, name: String(index + 1), students: 1 }),
    );

    renderWithTheme(<StudentsByClass metrics={metricsWith(slices)} loading={false} />);

    slices.forEach((cohort) => {
      expect(screen.getByText(`1º ano ${cohort.name}`)).toBeInTheDocument();
    });
  });
});
