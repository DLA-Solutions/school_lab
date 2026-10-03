import { ApiError, request } from './api';

/** A school year — the calendar the terms hang off. */
export interface SchoolYear {
  id: number;
  school_id: number;
  name: string;
  starts_on: string;
  ends_on: string;
  status: string;
}

/**
 * One calendar day's instructional marking (BR-SY10). A date with no row at all is simply
 * undecided — the admin screen only ever receives rows for dates someone has actually decided.
 */
export interface InstructionalDay {
  date: string;
  instructional: boolean;
}

/** A term within a year: the "bimestre" a boletim belongs to. */
export interface AcademicPeriod {
  id: number;
  name: string;
  sequence: number;
  starts_on: string;
  ends_on: string;
  closure_status: string;
}

const base = (schoolId: number) => `/api/v1/schools/${schoolId}/school_years`;

/** GET .../school_years — newest year first, which is the one usually wanted. */
export const listSchoolYears = async (schoolId: number): Promise<SchoolYear[]> => {
  const response = await request<{ data: SchoolYear[] }>(`${base(schoolId)}?page=1`);

  return response.data;
};

/**
 * GET .../school_years/active — the one year currently in session, if any (BR-SY01). A school
 * between years (none activated yet) answers `404`, read here as "no active year" rather than a
 * failure — the admin calendar then has nothing to mark against instead of an error banner.
 */
export const getActiveSchoolYear = async (schoolId: number): Promise<SchoolYear | null> => {
  try {
    const response = await request<{ data: SchoolYear }>(`${base(schoolId)}/active`);

    return response.data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }

    throw err;
  }
};

/**
 * GET .../school_years/:id/instructional_days — the admin's day-by-day marking screen reads one
 * calendar month at a time (UC-SY05). Only decided dates come back; everything else in the month
 * is undecided.
 */
export const fetchInstructionalDays = async (
  schoolId: number,
  schoolYearId: number,
  month: string,
): Promise<InstructionalDay[]> => {
  const response = await request<{ data: InstructionalDay[] }>(
    `${base(schoolId)}/${schoolYearId}/instructional_days?month=${month}`,
  );

  return response.data;
};

/**
 * PUT .../school_years/:id/instructional_days — upserts only the pairs given; any date left out
 * is left exactly as it was (UC-SY05 step 2) — this is not a replace-the-month operation.
 */
export const upsertInstructionalDays = async (
  schoolId: number,
  schoolYearId: number,
  days: InstructionalDay[],
): Promise<InstructionalDay[]> => {
  const response = await request<{ data: InstructionalDay[] }>(
    `${base(schoolId)}/${schoolYearId}/instructional_days`,
    { method: 'PUT', body: { instructional_days: days } },
  );

  return response.data;
};

/** GET .../school_years/:id/academic_periods — in teaching order. */
export const listAcademicPeriods = async (
  schoolId: number,
  schoolYearId: number,
): Promise<AcademicPeriod[]> => {
  const response = await request<{ data: AcademicPeriod[] }>(
    `${base(schoolId)}/${schoolYearId}/academic_periods`,
  );

  return response.data;
};
