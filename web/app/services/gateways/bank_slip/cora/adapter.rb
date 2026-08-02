# frozen_string_literal: true

module Gateways
  module BankSlip
    module Cora
      class Adapter
        include Interface

        PROVIDER = "cora"

        # A nil environment means "use the one on the school's active configuration row".
        def initialize(school:, environment: nil, client: nil)
          @school = school
          @client = client || Client.for_school(school: school, environment: environment)
        end

        def issue(request)
          body = RequestPayload.from(request).to_json
          response = client.post("/v2/invoices/", body: body, idempotency_key: request.idempotency_key)
          ResponseParser.parse_issuance(JSON.parse(response))
        end

        def cancel(provider_invoice_id:)
          client.delete("/v2/invoices/#{provider_invoice_id}")
          ResponseParser.parse_issuance(JSON.parse(client.get("/v2/invoices/#{provider_invoice_id}")))
        end

        def fetch_invoice(provider_invoice_id:)
          response = client.get("/v2/invoices/#{provider_invoice_id}")
          ResponseParser.parse_invoice(JSON.parse(response))
        end

        def list_invoices(since:, limit: 100)
          response = client.get("/v2/invoices/?start=#{since.iso8601}&perPage=#{limit}")
          payload = JSON.parse(response)
          Array(payload["items"]).map { |item| ResponseParser.parse_invoice(item) }
        end

        def capabilities
          Capabilities.new(
            inline_pix: true,
            native_notifications: true,
            cancellation: true,
            fine_and_interest: false,
            past_due_reissue: false
          )
        end

        private

        attr_reader :school, :client
      end
    end
  end
end
