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
}

const batchBody = (input: BatchInput) => ({ report_card_publication_batch: input });

const listQuery = ({
  page = 1,
  studentId,
  academicPeriodId,
}: Omit<ListMyReportCardsParams, 'schoolId'>) => {
  const query = new URLSearchParams({ page: String(page) });
  if (studentId !== undefined) {
    query.set('student_id', String(studentId));
  }
  if (academicPeriodId !== undefined) {
    query.set('academic_period_id', String(academicPeriodId));
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
export const fetchMyReportCardPdf = (
  schoolId: number,
  publicationId: number,
  snapshotId: number,
) =>
  requestBlob(`${familyBase(schoolId)}/${publicationId}/snapshots/${snapshotId}/pdf`);
