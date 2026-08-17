import { request } from './api';

/**
 * A child's health sheet — what the family wants the school to know: an allergy, a medication, a
 * condition the staff has to recognise on the day it matters.
 *
 * Mirrors `StudentHealthRecordBlueprint` (web/app/blueprints/student_health_record_blueprint.rb).
 */
export interface StudentHealthRecord {
  id: number | null;
  student_id: number;
  student_name: string | null;
  content: string;
  /** When the text was last written — null while nobody has filled it in. */
  content_updated_at: string | null;
  /** Who wrote it last. Both the family and the school may keep the sheet current. */
  updated_by_name: string | null;
  /** Blank means a family that has not been asked yet, not a child with nothing to report. */
  filled: boolean;
}

/**
 * The same sheet is reached from two sides: the school's register and the guardian portal. Which
 * students the caller may reach is decided by the API, so the only difference here is the path.
 */
const schoolPath = (schoolId: number, studentId: number) =>
  `/api/v1/schools/${schoolId}/people/students/${studentId}/health_record`;

const portalPath = (schoolId: number, studentId: number) =>
  `/api/v1/schools/${schoolId}/me/students/${studentId}/health_record`;

const pathFor = (schoolId: number, studentId: number, asGuardian: boolean) =>
  asGuardian ? portalPath(schoolId, studentId) : schoolPath(schoolId, studentId);

export const getHealthRecord = async (
  schoolId: number,
  studentId: number,
  { asGuardian = false } = {},
): Promise<StudentHealthRecord> => {
  const response = await request<{ data: StudentHealthRecord }>(
    pathFor(schoolId, studentId, asGuardian),
  );

  return response.data;
};

export const saveHealthRecord = async (
  schoolId: number,
  studentId: number,
  content: string,
  { asGuardian = false } = {},
): Promise<StudentHealthRecord> => {
  const response = await request<{ data: StudentHealthRecord }>(
    pathFor(schoolId, studentId, asGuardian),
    { method: 'PATCH', body: { health_record: { content } } },
  );

  return response.data;
};
