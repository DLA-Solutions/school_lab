# frozen_string_literal: true

module Gateways
  module ServiceInvoice
    module StatusNormalizer
      INTERNAL_STATUSES = %w[pending enqueued authorized rejected canceled failed].freeze

      SPEDY_MAPPING = {
        "pending" => "pending",
        "enqueued" => "enqueued",
        "processing" => "enqueued",
        "authorized" => "authorized",
        "rejected" => "rejected",
        "canceled" => "canceled",
        "cancelled" => "canceled",
        "failed" => "failed"
      }.freeze

      module_function

      def normalize(provider_status, mapping: SPEDY_MAPPING)
        key = provider_status.to_s
        normalized = mapping[key] || mapping[key.downcase]
        return normalized.to_s if normalized && INTERNAL_STATUSES.include?(normalized.to_s)

        raise ProviderError, "Unmapped provider status: #{provider_status.inspect}"
      end
    end
  end
end
