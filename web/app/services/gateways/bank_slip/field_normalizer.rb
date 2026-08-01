# frozen_string_literal: true

module Gateways
  module BankSlip
    module FieldNormalizer
      module_function

      def truncate_text(value, max_length:)
        return if value.blank?

        clusters = value.to_s.each_grapheme_cluster.to_a
        clusters.first(max_length).join
      end

      def normalize_cpf(value)
        digits = value.to_s.gsub(/\D/, "")
        digits.presence
      end

      def normalize_phone_e164(value)
        digits = value.to_s.gsub(/\D/, "")
        return if digits.blank?

        if digits.start_with?("55") && [12, 13].include?(digits.length)
          "+#{digits}"
        elsif [10, 11].include?(digits.length)
          "+55#{digits}"
        end
      end
    end
  end
end
