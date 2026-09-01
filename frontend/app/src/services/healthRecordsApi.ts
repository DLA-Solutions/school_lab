import { apiAssetUrl, request } from './api';

export type BloodType =
  | 'A+'
  | 'A-'
  | 'B+'
  | 'B-'
  | 'AB+'
  | 'AB-'
  | 'O+'
  | 'O-'
  | 'unknown';

export interface StudentHealthProfile {
  student_id: number;
  blood_type: BloodType | null;
  health_plan_name: string | null;
  health_plan_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  special_care_notes: string | null;
}

export type StudentHealthProfilePayload = Omit<StudentHealthProfile, 'student_id'>;

export interface StudentHealthRecord {
  id: number;
  student_id: number;
  title: string;
  content: string;
  has_document: boolean;
  document_url: string | null;
  document_filename: string | null;
  created_by_name: string | null;
  updated_by_name: string | null;
  content_updated_at: string | null;
  created_at: string;
}

export interface HealthRecordPayload {
  title: string;
  content?: string;
  document?: File | null;
}

const schoolProfilePath = (schoolId: number, studentId: number) =>
  `/api/v1/schools/${schoolId}/people/students/${studentId}/health_profile`;

const portalProfilePath = (schoolId: number, studentId: number) =>
  `/api/v1/schools/${schoolId}/me/students/${studentId}/health_profile`;

const schoolRecordsPath = (schoolId: number, studentId: number) =>
  `/api/v1/schools/${schoolId}/people/students/${studentId}/health_records`;

const portalRecordsPath = (schoolId: number, studentId: number) =>
  `/api/v1/schools/${schoolId}/me/students/${studentId}/health_records`;

const profilePathFor = (schoolId: number, studentId: number, asGuardian: boolean) =>
  asGuardian ? portalProfilePath(schoolId, studentId) : schoolProfilePath(schoolId, studentId);

const recordsPathFor = (schoolId: number, studentId: number, asGuardian: boolean) =>
  asGuardian ? portalRecordsPath(schoolId, studentId) : schoolRecordsPath(schoolId, studentId);

export const getHealthProfile = async (
  schoolId: number,
  studentId: number,
  { asGuardian = false } = {},
): Promise<StudentHealthProfile> => {
  const response = await request<{ data: StudentHealthProfile }>(
    profilePathFor(schoolId, studentId, asGuardian),
  );

  return response.data;
};

export const saveHealthProfile = async (
  schoolId: number,
  studentId: number,
  profile: StudentHealthProfilePayload,
): Promise<StudentHealthProfile> => {
  const response = await request<{ data: StudentHealthProfile }>(
    portalProfilePath(schoolId, studentId),
    { method: 'PUT', body: { health_profile: profile } },
  );

  return response.data;
};

export const listHealthRecords = async (
  schoolId: number,
  studentId: number,
  { asGuardian = false } = {},
): Promise<StudentHealthRecord[]> => {
  const response = await request<{ data: StudentHealthRecord[] }>(
    recordsPathFor(schoolId, studentId, asGuardian),
  );

  return response.data;
};

export const getHealthRecord = async (
  schoolId: number,
  studentId: number,
  recordId: number,
  { asGuardian = false } = {},
): Promise<StudentHealthRecord> => {
  const response = await request<{ data: StudentHealthRecord }>(
    `${recordsPathFor(schoolId, studentId, asGuardian)}/${recordId}`,
  );

  return response.data;
};

const appendRecordFields = (body: FormData, { title, content, document }: HealthRecordPayload) => {
  body.append('health_record[title]', title);
  if (content !== undefined) {
    body.append('health_record[content]', content);
  }
  if (document) {
    body.append('health_record[document]', document);
  }
};

export const createHealthRecord = async (
  schoolId: number,
  studentId: number,
  payload: HealthRecordPayload,
): Promise<StudentHealthRecord> => {
  const body = new FormData();
  appendRecordFields(body, payload);

  const response = await request<{ data: StudentHealthRecord }>(
    portalRecordsPath(schoolId, studentId),
    { method: 'POST', body },
  );

  return response.data;
};

export const updateHealthRecord = async (
  schoolId: number,
  studentId: number,
  recordId: number,
  payload: HealthRecordPayload,
): Promise<StudentHealthRecord> => {
  const body = new FormData();
  appendRecordFields(body, payload);

  const response = await request<{ data: StudentHealthRecord }>(
    `${portalRecordsPath(schoolId, studentId)}/${recordId}`,
    { method: 'PATCH', body },
  );

  return response.data;
};

export const deleteHealthRecord = (schoolId: number, studentId: number, recordId: number) =>
  request<null>(`${portalRecordsPath(schoolId, studentId)}/${recordId}`, { method: 'DELETE' });

export const healthRecordDocumentUrl = (record: StudentHealthRecord) =>
  apiAssetUrl(record.document_url);
