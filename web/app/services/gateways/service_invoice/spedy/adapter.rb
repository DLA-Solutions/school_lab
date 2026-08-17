# frozen_string_literal: true

module Gateways
  module ServiceInvoice
    module Spedy
      class Adapter
        include Interface

        PROVIDER = "spedy"

        def initialize(school:, client: nil, platform_client: nil)
          @school = school
          @client = client || with_port_errors { build_client(school) }
          @platform_client = platform_client
        end

        def issue(request)
          body = RequestPayload.from(request)
          response = with_port_errors { client.create_service_invoice(body: body) }
          ResponseParser.parse_issuance(JSON.parse(response))
        end

        def fetch(provider_document_id:)
          response = with_port_errors { client.fetch_service_invoice(document_id: provider_document_id) }
          ResponseParser.parse_document(JSON.parse(response))
        end

        def check_status(provider_document_id:)
          response = with_port_errors { client.check_status(document_id: provider_document_id) }
          ResponseParser.parse_document(JSON.parse(response))
        end

        def cancel(provider_document_id:, reason: nil)
          response = with_port_errors { client.cancel(document_id: provider_document_id, reason: reason) }
          ResponseParser.parse_document(JSON.parse(response))
        end

        def download_artifacts(provider_document_id:)
          pdf = with_port_errors { client.download_pdf(document_id: provider_document_id) }
          xml = with_port_errors { client.download_xml(document_id: provider_document_id) }
          ValueObjects::Artifacts.new(pdf_bytes: pdf, xml_bytes: xml)
        end

        def list_documents(since:, limit: 100)
          response = with_port_errors { client.list_service_invoices(since: since, limit: limit) }
          payload = JSON.parse(response)
          Array(payload["items"]).map { |item| ResponseParser.parse_document(item) }
        end

        def list_supported_cities(query: nil, state: nil, code: nil)
          response = with_port_errors do
            cities_client.list_cities(query: query, state: state, code: code)
          end
          ResponseParser.parse_cities(JSON.parse(response))
        end

        def capabilities
          Capabilities.new(correction_letter: false, cancellation: true, national_layout: true)
        end

        private

        attr_reader :school, :client, :platform_client

        def cities_client
          platform_client || client
        end

        def with_port_errors
          yield
        rescue SchoolLab::Integrations::Spedy::Error, SchoolLab::Http::ConnectionError => error
          ErrorMapper.map(error)
        end

        def build_client(school)
          config = Registry.active_config(school: school)
          SchoolLab::Integrations::Spedy::Client.new(api_key: config.api_key)
        end
      end
    end
  end
end
