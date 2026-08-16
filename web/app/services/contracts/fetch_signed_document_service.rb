# frozen_string_literal: true

module Contracts
  # Fetches the provider's signed file — the agreement plus the signature page, which is the copy
  # that proves anything.
  #
  # It is fetched here rather than linked to because the provider's URL answers only to the
  # school's API token: handing that URL to a browser returns 403, and handing the browser the
  # token instead would put a credential that can sign documents into the page.
  class FetchSignedDocumentService < ApplicationService
    CONNECT_TIMEOUT = 5
    # The file carries every signature page, so it is measured in hundreds of kilobytes rather
    # than the few any JSON call moves.
    READ_TIMEOUT = 30

    def initialize(contract:)
      @contract = contract
    end

    def call
      return not_signed unless contract.signed?
      return no_document if contract.signed_document_url.blank?

      response = SchoolLab::Http.execute { request }

      return provider_error(response.status) unless response.status == 200

      ResponseService.success(
        data: { pdf: response.body, filename: filename }
      )
    rescue Gateways::Signature::Registry::MissingConfigurationError, SchoolLab::Http::ConnectionError => e
      log_failure(e)
      ResponseService.failure(code: :provider_error, details: { base: [ I18n.t("api.errors.signed_document_unavailable") ] })
    end

    private

    attr_reader :contract

    def request
      uri = URI(contract.signed_document_url)
      connection = SchoolLab::Http.build_connection(
        base_url: "#{uri.scheme}://#{uri.host}",
        open_timeout: CONNECT_TIMEOUT,
        read_timeout: READ_TIMEOUT
      )

      connection.run_request(:get, uri.request_uri, nil, { "Authorization" => "Bearer #{api_token}" })
    end

    def api_token
      Gateways::Signature::Registry.active_config(school: contract.school).api_token
    end

    # Named after the student, since that is how a school looks for one of these afterwards.
    def filename
      student = contract.student&.name.to_s.parameterize.presence || "contrato"
      "contrato-assinado-#{student}.pdf"
    end

    def not_signed
      ResponseService.failure(
        code: :validation_error,
        details: { base: [ I18n.t("api.errors.contract_not_signed") ] }
      )
    end

    def no_document
      ResponseService.failure(
        code: :not_found,
        details: { base: [ I18n.t("api.errors.signed_document_missing") ] }
      )
    end

    def provider_error(status)
      log_failure("provider responded #{status}")
      ResponseService.failure(
        code: :provider_error,
        details: { base: [ I18n.t("api.errors.signed_document_unavailable") ] }
      )
    end

    def log_failure(reason)
      Rails.logger.error(
        {
          event: "contract.signed_document_fetch_failed",
          contract_id: contract.id,
          school_id: contract.school_id,
          reason: reason.to_s
        }.to_json
      )
    end
  end
end
