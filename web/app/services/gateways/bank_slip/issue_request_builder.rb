# frozen_string_literal: true

module Gateways
  module BankSlip
    module IssueRequestBuilder
      module_function

      def from_charge(charge, service_description: nil)
        guardian = charge.guardian
        ValueObjects::IssueRequest.new(
          idempotency_key: "charge-#{charge.id}",
          total_amount_cents: charge.total_amount_cents,
          due_date: charge.due_date,
          customer: ValueObjects::Customer.new(
            name: guardian.name,
            document_number: guardian.try(:document_number),
            email: guardian.user&.email
          ),
          service_description: service_description,
          school_id: charge.school_id,
          charge_id: charge.id
        )
      end
    end
  end
end
