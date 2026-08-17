# frozen_string_literal: true

module Backoffice
  class ProvisionSpedyCompanyService < ApplicationService
    def initialize(school:, actor:, platform_client: nil)
      @school = school
      @actor = actor
      @platform_client = platform_client
    end

    def call
      response = platform_client.create_company(body: company_payload)
      data = JSON.parse(response)
      api_key = data.fetch("apiKey")
      company_id = data.fetch("id").to_s

      record = nil
      ActiveRecord::Base.transaction do
        supersede_active_configuration!
        record = school.school_payment_providers.create!(
          instrument: Gateways::ServiceInvoice::Registry::INSTRUMENT,
          provider: "spedy",
          active: true,
          api_key: api_key,
          settings: { spedy_company_id: company_id },
          uploaded_at: Time.current,
          uploaded_by: actor
        )
      end

      ResponseService.success(data: record)
    rescue SchoolLab::Integrations::Spedy::Error => e
      ResponseService.failure(code: :provider_error, details: { message: e.message })
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    private

    attr_reader :school, :actor

    def company_payload
      {
        name: school.name,
        federalTaxNumber: Cnpj.normalize(school.cnpj),
        email: school.signature_email.presence || school.email
      }.compact
    end

    def platform_client
      @platform_client ||= SchoolLab::Integrations::Spedy::Client.new(
        api_key: SchoolLab::Integrations::Spedy::Configuration.platform_api_key
      )
    end

    def supersede_active_configuration!
      school.school_payment_providers.active
            .where(instrument: Gateways::ServiceInvoice::Registry::INSTRUMENT)
            .find_each { |config| config.update!(active: false) }
    end
  end
end
