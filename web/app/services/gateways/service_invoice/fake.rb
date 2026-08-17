# frozen_string_literal: true

module Gateways
  module ServiceInvoice
    class Fake
      include Interface

      PROVIDER = "fake"

      def initialize(school:)
        @school = school
        @documents = {}
        @idempotency_index = {}
      end

      def issue(request)
        existing_id = @idempotency_index[request.integration_id]
        if existing_id
          return @documents.fetch(existing_id)[:issuance]
        end

        provider_document_id = "fake-si-#{school.id}-#{request.payment_id}"
        issuance = ValueObjects::Issuance.new(
          provider_document_id: provider_document_id,
          status: "enqueued",
          invoice_number: nil,
          verification_code: nil,
          access_key: nil
        )

        @documents[provider_document_id] = {
          issuance: issuance,
          request: request,
          status: "enqueued"
        }
        @idempotency_index[request.integration_id] = provider_document_id

        issuance
      end

      def fetch(provider_document_id:)
        entry = @documents.fetch(provider_document_id) do
          raise ProviderError, "Document not found: #{provider_document_id}"
        end

        issuance = entry[:issuance]

        ValueObjects::RemoteDocument.new(
          provider_document_id: provider_document_id,
          status: entry[:status],
          invoice_number: issuance.invoice_number,
          verification_code: issuance.verification_code,
          access_key: issuance.access_key,
          paid_amount_cents: entry[:request].paid_amount_cents,
          effective_date: entry[:request].paid_at.to_date
        )
      end

      def check_status(provider_document_id:)
        fetch(provider_document_id: provider_document_id)
      end

      def cancel(provider_document_id:, reason: nil)
        entry = @documents.fetch(provider_document_id)
        entry[:status] = "canceled"
        fetch(provider_document_id: provider_document_id)
      end

      def download_artifacts(provider_document_id:)
        ValueObjects::Artifacts.new(
          pdf_bytes: "%PDF-fake-#{provider_document_id}",
          xml_bytes: "<xml>fake-#{provider_document_id}</xml>"
        )
      end

      def list_documents(since:, limit: 100)
        @documents.values
                  .select { |entry| entry[:request].paid_at >= since }
                  .first(limit)
                  .map { |entry| fetch(provider_document_id: entry[:issuance].provider_document_id) }
      end

      def list_supported_cities(query: nil, state: nil, code: nil)
        [
          ValueObjects::SupportedCity.new(
            code: code || 5_208_707,
            name: query.presence || "Goiânia",
            state: state.presence || "GO",
            provider: "ISSNet",
            provider_options: {}
          )
        ]
      end

      def authorize!(provider_document_id:)
        entry = @documents.fetch(provider_document_id)
        entry[:status] = "authorized"
        entry[:issuance] = ValueObjects::Issuance.new(
          provider_document_id: provider_document_id,
          status: "authorized",
          invoice_number: "12345",
          verification_code: "ABCD1234",
          access_key: "35260817211215001234567890123456789012345678"
        )
      end

      def capabilities
        Capabilities.new(correction_letter: false, cancellation: true, national_layout: true)
      end

      private

      attr_reader :school
    end
  end
end
