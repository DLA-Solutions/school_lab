import { AppNotification } from 'types/notification';
import { request } from './api';

export interface NotificationsResponse {
  data: AppNotification[];
  meta: { page: number; per_page: number; total: number; unread_count: number };
}

/** GET /api/v1/notifications — newest first, with the current unread count. */
export const listNotifications = () => request<NotificationsResponse>('/api/v1/notifications');

/** PATCH /api/v1/notifications/:id — marks one notification read. */
export const markNotificationRead = async (id: number): Promise<AppNotification> => {
  const response = await request<{ data: AppNotification }>(`/api/v1/notifications/${id}`, {
    method: 'PATCH',
  });

  return response.data;
};

/** POST /api/v1/notifications/mark_all_as_read — clears the unread count in one call. */
export const markAllNotificationsRead = () =>
  request<{ data: { unread_count: number } }>('/api/v1/notifications/mark_all_as_read', {
    method: 'POST',
  });
