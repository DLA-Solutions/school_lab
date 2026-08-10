# frozen_string_literal: true

class ContractBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :student_id, :billing_plan_id, :negotiated_amount_cents, :due_day,
         :starts_on, :ends_on, :status, :signature_status, :sent_at, :signed_at,
         :signature_provider, :signature_requested_at, :plan_discount_id, :payer_guardian_id

  # Saves the contract list a lookup per row just to name the child it belongs to.
  field :student_name do |contract|
    contract.student&.name
  end

  # Who the boletos go out to, named so a listing can say it without another lookup.
  field :payer_name do |contract|
    contract.payer&.name
  end

  # Where the signed agreement itself can be read, once the family has signed it — the provider's
  # own file, with the signature page it appends, rather than our re-render of what we sent.
  field :signed_document_url

  # Whether the agreement actually reached the provider. A contract can exist while its send
  # failed, and the screen has to tell "created" from "in the family's inbox".
  field :sent_to_provider do |contract|
    contract.provider_document_id.present?
  end
end
