# frozen_string_literal: true

module Backoffice
  class UploadFiscalCertificateService < ApplicationService
    MAX_FILE_BYTES = 256.kilobytes

    def initialize(school:, actor:, certificate_io:, password:, client: nil)
      @school = school
      @actor = actor
      @certificate_io = certificate_io
      @password = password
      @client = client
    end

    def call
      return ResponseService.failure(code: :validation_error, details: { certificate: [ "blank" ] }) if certificate_io.blank?
      return ResponseService.failure(code: :validation_error, details: { password: [ "blank" ] }) if password.blank?

      config = Gateways::ServiceInvoice::Registry.active_config(school: school)
      company_id = config.spedy_company_id
      return ResponseService.failure(code: :fiscal_configuration_incomplete) if company_id.blank?

      client.add_certificate(company_id: company_id, file_io: certificate_io, password: password)
      ResponseService.success(data: config)
    rescue SchoolLab::Integrations::Spedy::ValidationError => e
      ResponseService.failure(code: :validation_error, details: e.details)
    rescue SchoolLab::Integrations::Spedy::Error => e
      ResponseService.failure(code: :provider_error, details: { message: e.message })
    end

    private

    attr_reader :school, :actor, :certificate_io, :password

    def client
      @client ||= begin
        config = Gateways::ServiceInvoice::Registry.active_config(school: school)
        SchoolLab::Integrations::Spedy::Client.new(api_key: config.api_key)
      end
    end
  end
end
