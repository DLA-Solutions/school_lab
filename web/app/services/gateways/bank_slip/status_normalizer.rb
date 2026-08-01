# frozen_string_literal: true

module Gateways
  module BankSlip
    module StatusNormalizer
      INTERNAL_STATUSES = %w[draft open paid late cancelled].freeze

      module_function

      def normalize(provider_status, mapping:)
        key = provider_status.to_s
        normalized = mapping[key] || mapping[key.upcase] || mapping[key.downcase]
        return normalized.to_s if normalized && INTERNAL_STATUSES.include?(normalized.to_s)

        raise ProviderError, "Unmapped provider status: #{provider_status.inspect}"
      end
    end
  end
end
