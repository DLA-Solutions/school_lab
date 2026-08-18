/** Mirrors `SchoolFiscalSettingsBlueprint`. */
export interface FiscalSettings {
  id: number;
  enabled: boolean;
  issuance_city_name: string;
  issuance_state: string;
  spedy_city_code: number;
  federal_service_code: string | null;
  cnae_code: string | null;
  city_service_code: string | null;
  nbs_code: string | null;
  national_taxation_code: string | null;
  iss_rate_percent: number | null;
  service_description: string | null;
  taxation_type: string;
  tax_location: string;
  issue_type: string | null;
  reform_tributaria_enabled: boolean | null;
  provider_options_snapshot: Record<string, unknown>;
  ibs_cbs_config: Record<string, unknown>;
}

export interface FiscalSettingsPayload {
  enabled?: boolean;
  issuance_city_name?: string;
  issuance_state?: string;
  spedy_city_code?: number;
  federal_service_code?: string | null;
  cnae_code?: string | null;
  city_service_code?: string | null;
  nbs_code?: string | null;
  national_taxation_code?: string | null;
  iss_rate_percent?: number | null;
  service_description?: string | null;
  taxation_type?: string;
  tax_location?: string;
  issue_type?: string | null;
  reform_tributaria_enabled?: boolean | null;
  provider_options_snapshot?: Record<string, unknown>;
  ibs_cbs_config?: Record<string, unknown>;
}
