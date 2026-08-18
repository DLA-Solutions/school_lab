# frozen_string_literal: true

module Billing
  class SearchSupportedCitiesService < ApplicationService
    def initialize(school:, query: nil, state: nil, code: nil, adapter: nil)
      @school = school
      @query = query
      @state = state
      @code = code
      @adapter = adapter
    end

    def call
      cities = adapter.list_supported_cities(query: query, state: state, code: code)
      ResponseService.success(data: cities)
    rescue Gateways::ServiceInvoice::TransientError
      raise
    rescue Gateways::ServiceInvoice::Error => e
      ResponseService.failure(code: :provider_error, details: { message: e.message })
    end

    private

    attr_reader :school, :query, :state, :code

    def adapter
      @adapter ||= resolve_adapter
    end

    def resolve_adapter
      if school.school_payment_providers.active.exists?(instrument: Gateways::ServiceInvoice::Registry::INSTRUMENT)
        config = Gateways::ServiceInvoice::Registry.active_config(school: school)
        Gateways::ServiceInvoice::Registry.resolve(school: school, provider: config.provider)
      else
        platform_key = SchoolLab::Integrations::Spedy::Configuration.platform_api_key
        client = SchoolLab::Integrations::Spedy::Client.new(api_key: platform_key)
        Gateways::ServiceInvoice::Spedy::Adapter.new(school: school, client: client, platform_client: client)
      end
    end
  end
end
