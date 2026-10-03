import {
  MyReportCardListResponse,
  ReportCardBatch,
  ReportCardConfig,
  ReportCardPublication,
  ReportCardRepublishResult,
  ReportCardSnapshot,
  ReportCardValidateResult,
} from 'types/reportCard';
import { request, requestBlob } from './api';

const staffBase = (schoolId: number) => `/api/v1/schools/${schoolId}/academics`;

const familyBase = (schoolId: number) => `/api/v1/schools/${schoolId}/me/report_cards`;

export interface BatchInput {
  class_id: number;
  academic_period_id: number;
  scheduled_for?: string | null;
  force_publish_reason?: string | null;
}

export interface ListMyReportCardsParams {
  schoolId: number;
  page?: number;
  studentId?: number;
  academicPeriodId?: number;
  /** Every term of one year, used when no single term was asked for. */
  schoolYearId?: number;
}

const batchBody = (input: BatchInput) => ({ report_card_publication_batch: input });

const listQuery = ({
  page = 1,
  studentId,
  academicPeriodId,
  schoolYearId,
}: Omit<ListMyReportCardsParams, 'schoolId'>) => {
  const query = new URLSearchParams({ page: String(page) });
  if (studentId !== undefined) {
    query.set('student_id', String(studentId));
  }
  if (academicPeriodId !== undefined) {
    query.set('academic_period_id', String(academicPeriodId));
  }
  if (schoolYearId !== undefined) {
    query.set('school_year_id', String(schoolYearId));
  }

  return query;
};

/** GET .../academics/report_card_config */
export const getReportCardConfig = async (schoolId: number): Promise<ReportCardConfig> => {
  const response = await request<{ data: ReportCardConfig }>(
    `${staffBase(schoolId)}/report_card_config`,
  );

  return response.data;
};

/** PATCH .../academics/report_card_config */
export const updateReportCardConfig = async (
  schoolId: number,
  config: Partial<
    Pick<
      ReportCardConfig,
      'template_key' | 'header_text' | 'footer_text' | 'document_signatory_id' | 'display_config'
    >
  >,
): Promise<ReportCardConfig> => {
  const response = await request<{ data: ReportCardConfig }>(
    `${staffBase(schoolId)}/report_card_config`,
    {
      method: 'PATCH',
      body: { report_card_config: config },
    },
  );

  return response.data;
};

/** POST .../academics/report_card_publication_batches/validate */
export const validateReportCardBatch = async (
  schoolId: number,
  input: BatchInput,
): Promise<ReportCardValidateResult> => {
  const response = await request<{ data: ReportCardValidateResult }>(
    `${staffBase(schoolId)}/report_card_publication_batches/validate`,
    {
      method: 'POST',
      body: batchBody(input),
    },
  );

  return response.data;
};

/** POST .../academics/report_card_publication_batches */
export const publishReportCardBatch = async (
  schoolId: number,
  input: BatchInput,
): Promise<ReportCardBatch> => {
  const response = await request<{ data: ReportCardBatch }>(
    `${staffBase(schoolId)}/report_card_publication_batches`,
    {
      method: 'POST',
      body: batchBody(input),
    },
  );

  return response.data;
};

/** GET .../academics/report_card_publication_batches/:batch_id */
export const getReportCardBatch = async (
  schoolId: number,
  batchId: number,
): Promise<ReportCardBatch> => {
  const response = await request<{ data: ReportCardBatch }>(
    `${staffBase(schoolId)}/report_card_publication_batches/${batchId}`,
  );

  return response.data;
};

/** GET .../academics/report_card_publications/:publication_id */
export const getReportCardPublication = async (
  schoolId: number,
  publicationId: number,
): Promise<ReportCardPublication> => {
  const response = await request<{ data: ReportCardPublication }>(
    `${staffBase(schoolId)}/report_card_publications/${publicationId}`,
  );

  return response.data;
};

/** POST .../academics/report_card_publications/:publication_id/republish */
export const republishReportCard = async (
  schoolId: number,
  publicationId: number,
  correctionReason: string,
): Promise<ReportCardRepublishResult> => {
  const response = await request<{ data: ReportCardRepublishResult }>(
    `${staffBase(schoolId)}/report_card_publications/${publicationId}/republish`,
    {
      method: 'POST',
      body: { report_card_publication: { correction_reason: correctionReason } },
    },
  );

  return response.data;
};

/**
 * GET .../academics/report_card_publications — one student's published report cards, as the school
 * reads them from the register. `academic_period_id` narrows it to a single term.
 */
export const listStudentReportCards = ({
  schoolId,
  page,
  studentId,
  academicPeriodId,
  schoolYearId,
}: ListMyReportCardsParams) =>
  request<MyReportCardListResponse>(
    `${staffBase(schoolId)}/report_card_publications?${listQuery({
      page,
      studentId,
      academicPeriodId,
      schoolYearId,
    })}`,
  );

/** GET .../academics/report_card_publications/:publication_id/snapshots/:snapshot_id/pdf */
export const fetchStudentReportCardPdf = (
  schoolId: number,
  publicationId: number,
  snapshotId: number,
) =>
  requestBlob(
    `${staffBase(schoolId)}/report_card_publications/${publicationId}/snapshots/${snapshotId}/pdf`,
  );

/** GET .../me/report_cards */
export const listMyReportCards = ({
  schoolId,
  page,
  studentId,
  academicPeriodId,
}: ListMyReportCardsParams) =>
  request<MyReportCardListResponse>(
    `${familyBase(schoolId)}?${listQuery({ page, studentId, academicPeriodId })}`,
  );

/** GET .../me/report_cards/:publication_id */
export const getMyReportCard = async (
  schoolId: number,
  publicationId: number,
): Promise<ReportCardPublication> => {
  const response = await request<{ data: ReportCardPublication }>(
    `${familyBase(schoolId)}/${publicationId}`,
  );

  return response.data;
};

/** GET .../me/report_cards/:publication_id/snapshots/:snapshot_id */
export const getMyReportCardSnapshot = async (
  schoolId: number,
  publicationId: number,
  snapshotId: number,
): Promise<ReportCardSnapshot> => {
  const response = await request<{ data: ReportCardSnapshot }>(
    `${familyBase(schoolId)}/${publicationId}/snapshots/${snapshotId}`,
  );

  return response.data;
};

/** GET .../me/report_cards/:publication_id/snapshots/:snapshot_id/pdf */
export const fetchMyReportCardPdf = (schoolId: number, publicationId: number, snapshotId: number) =>
  requestBlob(`${familyBase(schoolId)}/${publicationId}/snapshots/${snapshotId}/pdf`);

/**
 * GET .../academics/students/:student_id/report_card_preview/pdf?academic_period_id=
 *
 * A teacher's live, unpublished boletim preview (BR-RC14): rendered on demand from the student's
 * *current* grade and attendance state, covering every discipline of the student's class — not
 * only the one the requesting teacher teaches, and not the published snapshot. It creates no
 * publication or snapshot row, so there is nothing to poll or list; the PDF bytes are the whole
 * response.
 *
 * `academicPeriodId` also accepts the literal `'all'` (BR-RC14, AC-RC13): one combined PDF with a
 * section per period of the school year, in sequence order. That literal goes on the wire exactly
 * as typed — never through `Number(...)` or similar — since it is not a period id at all.
 */
export const fetchReportCardPreviewPdf = (
  schoolId: number,
  studentId: number,
  academicPeriodId: number | 'all',
) =>
  requestBlob(
    `${staffBase(schoolId)}/students/${studentId}/report_card_preview/pdf?academic_period_id=${academicPeriodId}`,
  );
