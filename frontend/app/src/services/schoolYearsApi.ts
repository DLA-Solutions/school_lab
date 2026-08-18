import { request } from './api';

/** A school year — the calendar the terms hang off. */
export interface SchoolYear {
  id: number;
  school_id: number;
  name: string;
  starts_on: string;
  ends_on: string;
  status: string;
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
