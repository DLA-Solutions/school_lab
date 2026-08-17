# frozen_string_literal: true

module Billing
  class PurposeConfigurationDigest
    def self.compute(purposes)
      payload = purposes.map do |purpose|
        {
          code: purpose.code,
          tax_declaration_eligible: purpose.tax_declaration_eligible
        }
      end

      Digest::SHA256.hexdigest(JSON.generate(payload))
    end

    def self.snapshot_for(school)
      purposes = school.billing_purposes.kept.ordered
      {
        configuration_digest: compute(purposes),
        purposes: purposes.map do |purpose|
          {
            id: purpose.id,
            code: purpose.code,
            name: purpose.name,
            tax_declaration_eligible: purpose.tax_declaration_eligible
          }
        end
      }
    end
  end
end
