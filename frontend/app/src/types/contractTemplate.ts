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
  /**
   * Who else receives every contract this school sends — its own copy. They are not asked to
   * sign: the provider delivers the document to them and nothing more.
   */
  copy_emails: string[];
  logo_url: string | null;
  logo_filename: string | null;
  variables: ContractTemplateVariable[];
  updated_at: string | null;
}

export interface ContractTemplatePayload {
  body_html: string;
  copy_emails: string[];
}

export interface ContractTemplatePreview {
  html: string;
  /** True when rendered with stand-in data because the school has no contract yet. */
  sample: boolean;
}
