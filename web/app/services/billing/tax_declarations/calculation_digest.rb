# frozen_string_literal: true

module Billing
  module TaxDeclarations
    class CalculationDigest
      Line = Data.define(
        :payment_id,
        :charge_id,
        :billing_purpose_code,
        :tax_declaration_eligible,
        :declared_principal_amount_cents
      )

      def self.compute(lines:, settings:)
        payload = {
          settings_version: settings.configuration_version,
          purpose_digest: settings.approved_purpose_configuration_digest,
          lines: lines.map(&:to_h).sort_by { |row| row[:payment_id] }
        }

        Digest::SHA256.hexdigest(JSON.generate(payload))
      end
    end
  end
end
