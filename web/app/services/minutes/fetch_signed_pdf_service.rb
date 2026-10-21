# frozen_string_literal: true

module Minutes
  # Fetches the provider's signed file — the ata plus the signature page, which is the copy that
  # proves anything. Fetched here rather than linked to because the provider's URL answers only to
  # the school's API token, which can sign documents and so never leaves the server. The minutes
  # counterpart of `Contracts::FetchSignedDocumentService`.
  class FetchSignedPdfService < ApplicationService
    CONNECT_TIMEOUT = 5
    READ_TIMEOUT = 30

    def initialize(entry:)
      @entry = entry
    end

    def call
      return not_signed unless entry.signed?
      return no_document if entry.signed_document_url.blank?

      response = SchoolLab::Http.execute { request }

      return provider_error("provider responded #{response.status}") unless response.status == 200

      ResponseService.success(data: { pdf: response.body, filename: filename })
    rescue Gateways::Signature::Registry::MissingConfigurationError, SchoolLab::Http::ConnectionError => e
      provider_error(e)
    end

    private

    attr_reader :entry

    def request
      uri = URI(entry.signed_document_url)
      connection = SchoolLab::Http.build_connection(
        base_url: "#{uri.scheme}://#{uri.host}",
        open_timeout: CONNECT_TIMEOUT,
        read_timeout: READ_TIMEOUT
      )

      connection.run_request(:get, uri.request_uri, nil, { "Authorization" => "Bearer #{api_token}" })
    end

    def api_token
      Gateways::Signature::Registry.active_config(school: entry.school).api_token
    end

    def filename
      "ata-assinada-#{entry.id}-#{entry.title.to_s.parameterize.presence || 'ata'}.pdf"
    end

    def not_signed
      ResponseService.failure(
        code: :validation_error,
        details: { base: [ I18n.t("api.errors.minutes_entry_not_signed") ] }
      )
    end

    def no_document
      ResponseService.failure(
        code: :not_found,
        details: { base: [ I18n.t("api.errors.signed_document_missing") ] }
      )
    end

    def provider_error(reason)
      Rails.logger.error(
        {
          event: "minutes.signed_pdf_fetch_failed",
          minutes_entry_id: entry.id,
          school_id: entry.school_id,
          reason: reason.to_s
        }.to_json
      )

      ResponseService.failure(
        code: :provider_error,
        details: { base: [ I18n.t("api.errors.minutes_signed_pdf_unavailable") ] }
      )
    end
  end
end
