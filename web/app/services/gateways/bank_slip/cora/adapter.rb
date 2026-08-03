# frozen_string_literal: true

module Gateways
  module BankSlip
    module Cora
      class Adapter
        include Interface

        PROVIDER = "cora"

        def initialize(school:, client: nil)
          @school = school
          @client = client || with_port_errors { build_client(school) }
        end

        def issue(request)
          body = RequestPayload.from(request).to_json
          response = with_port_errors do
            client.post("/v2/invoices/", body: body, idempotency_key: request.idempotency_key)
          end
          ResponseParser.parse_issuance(JSON.parse(response))
        end

        def cancel(provider_invoice_id:)
          with_port_errors { client.delete("/v2/invoices/#{provider_invoice_id}") }
          response = with_port_errors { client.get("/v2/invoices/#{provider_invoice_id}") }
          ResponseParser.parse_issuance(JSON.parse(response))
        end

        def fetch_invoice(provider_invoice_id:)
          response = with_port_errors { client.get("/v2/invoices/#{provider_invoice_id}") }
          ResponseParser.parse_invoice(JSON.parse(response))
        end

        def list_invoices(since:, limit: 100)
          response = with_port_errors do
            client.get("/v2/invoices/?start=#{since.iso8601}&perPage=#{limit}")
          end
          payload = JSON.parse(response)
          Array(payload["items"]).map { |item| ResponseParser.parse_invoice(item) }
        end

        def capabilities
          Capabilities.new(
            inline_pix: true,
            native_notifications: true,
            cancellation: true,
            fine_and_interest: true,
            past_due_reissue: false
          )
        end

        private

        attr_reader :school, :client

        def with_port_errors
          yield
        rescue SchoolLab::Integrations::Cora::Error, SchoolLab::Http::ConnectionError => error
          ErrorMapper.map(error)
        end

        def build_client(school)
          config = Registry.active_config(school: school)
          token_cache = SchoolLab::Integrations::Cora::TokenCache.new(
            school_id: school.id,
            provider: config.provider,
            token_url: SchoolLab::Integrations::Cora::Configuration.current.fetch(:token_url)
          )
          SchoolLab::Integrations::Cora::Client.new(
            client_id: config.client_id,
            certificate_pem: config.certificate_pem,
            private_key_pem: config.private_key_pem,
            token_cache: token_cache
          )
        end
      end
    end
  end
end
