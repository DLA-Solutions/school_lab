import { AnnouncementListResponse } from '../types/announcements';
import { request } from './api';

/**
 * Guardian announcement feed for one school.
 * GET /api/v1/schools/:school_id/me/announcements
 * (`API_BASE_URL` already includes `/api/v1`).
 */
export const listAnnouncements = (schoolId: number): Promise<AnnouncementListResponse> =>
  request(`/schools/${schoolId}/me/announcements`);
