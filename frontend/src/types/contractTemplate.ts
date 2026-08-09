/** Mirrors `ContractTemplateBlueprint` (web/app/blueprints/contract_template_blueprint.rb). */
export interface ContractTemplateVariable {
  token: string;
  description: string;
}

export interface ContractTemplate {
  id: number | null;
  school_id: number;
  /** Sanitized server-side on every write — scripts and handlers never make it into storage. */
  body_html: string;
  /** Where the signature field goes, as a percentage of the page from its top-left corner. */
  signature_x: string;
  signature_y: string;
  signature_page: number;
  logo_url: string | null;
  logo_filename: string | null;
  variables: ContractTemplateVariable[];
  updated_at: string | null;
}

export interface ContractTemplatePayload {
  body_html: string;
  signature_x: number;
  signature_y: number;
  signature_page: number;
}

export interface ContractTemplatePreview {
  html: string;
  /** True when rendered with stand-in data because the school has no contract yet. */
  sample: boolean;
}
