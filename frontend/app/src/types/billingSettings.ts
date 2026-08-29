export type FineType = 'percent' | 'fixed' | null;

export interface BillingSettings {
  school_id: number;
  overdue_grace_days: number;
  service_description: string;
  notification_schedule: {
    reminders: Array<{ days_before_due?: number; days_after_due?: number }>;
  };
  interest_rate_percent: number | null;
  early_payment_discount_percent: number | null;
  early_payment_discount_day: number | null;
  fine_type: FineType;
  fine_rate_percent: number | null;
  fine_amount_cents: number | null;
  persisted: boolean;
}

export interface BillingSettingsResponse {
  data: BillingSettings;
}

export interface BillingSettingsPayload {
  overdue_grace_days?: number;
  service_description?: string;
  interest_rate_percent?: number | null;
  early_payment_discount_percent?: number | null;
  early_payment_discount_day?: number | null;
  fine_type?: FineType | '';
  fine_rate_percent?: number | null;
  fine_amount_cents?: number | null;
}
