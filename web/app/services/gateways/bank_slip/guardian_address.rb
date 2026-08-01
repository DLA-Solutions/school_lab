# frozen_string_literal: true

module Gateways
  module BankSlip
    module GuardianAddress
      ADDRESS_FIELDS = %i[street number neighborhood city state postal_code].freeze

      module_function

      def from(guardian)
        values = ADDRESS_FIELDS.index_with { |field| guardian.try(field)&.presence }
        return if values.values.any?(&:blank?)

        ValueObjects::Address.new(
          street: values.fetch(:street),
          number: values.fetch(:number),
          complement: guardian.try(:address_complement),
          neighborhood: values.fetch(:neighborhood),
          city: values.fetch(:city),
          state: values.fetch(:state),
          postal_code: values.fetch(:postal_code)
        )
      end
    end
  end
end
