export type AnnouncementTargetScope = 'school' | 'class' | 'segment';

/** Guardian feed row. Extra JSON fields are ignored by the screens. */
export interface Announcement {
  id: number;
  title: string;
  body: string;
  published_at?: string | null;
  school_id?: number | null;
  target_scope?: AnnouncementTargetScope | null;
}

export interface AnnouncementListResponse {
  data?: Announcement[];
}
