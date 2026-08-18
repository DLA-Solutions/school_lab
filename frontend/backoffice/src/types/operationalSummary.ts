import { SchoolModuleKey } from 'types/modules';

export interface ExpiringCredentialSummary {
  school_id: number;
  school_name: string;
  certificate_expires_at: string;
  days_remaining: number;
}

export interface DisabledModulesSummary {
  school_id: number;
  school_name: string;
  disabled_modules: SchoolModuleKey[];
}

export interface OperationalSummary {
  credentials_expiring: ExpiringCredentialSummary[];
  schools_with_disabled_modules: DisabledModulesSummary[];
  provisioning_backlog_count: number;
}
