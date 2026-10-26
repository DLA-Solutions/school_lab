/** Mirrors `BillingPurposeBlueprint` (web/app/blueprints/billing_purpose_blueprint.rb). */
export interface BillingPurpose {
  id: number;
  /** Stable key such as `tuition` or `activity`; the name is what the school reads. */
  code: string;
  name: string;
  tax_declaration_eligible: boolean;
}
