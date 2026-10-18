# frozen_string_literal: true

require "uri"

module Gateways
  module BankSlip
    module Inter
      class Adapter
        include Interface

        PROVIDER = "inter"

        BASE_PATH = "/cobranca/v3/cobrancas"

        # Inter's internal, admin-facing cancellation reason (not shown to the payer). Capped at
        # 50 chars by the provider; this fixed string is well under that.
        CANCELLATION_REASON = "Cancelled via School Lab"

        def initialize(school:, client: nil)
          @school = school
          @client = client || with_port_errors { build_client(school) }
        end

        # Inter's issuance is asynchronous: the only synchronous response is a request id. There
        # is no Idempotency-Key header to send either — Inter dedupes server-side on
        # (seuNumero, valorNominal, dataVencimento, cpfCnpj) for 30 minutes, so
        # `request.idempotency_key` is not used in this HTTP call (unlike Cora's).
        def issue(request)
          body = RequestPayload.from(request).to_json
          response = with_port_errors { client.post(BASE_PATH, body: body) }
          codigo_solicitacao = JSON.parse(response).fetch("codigoSolicitacao")

          ResponseParser.parse_pending_issuance(
            codigo_solicitacao: codigo_solicitacao,
            amount_cents: request.total_amount_cents
          )
        end

        def cancel(provider_invoice_id:)
          body = { motivoCancelamento: CANCELLATION_REASON }.to_json
          with_port_errors { client.post("#{BASE_PATH}/#{provider_invoice_id}/cancelar", body: body) }

          response = with_port_errors { client.get("#{BASE_PATH}/#{provider_invoice_id}") }
          ResponseParser.parse_issuance(JSON.parse(response))
        end

        def fetch_invoice(provider_invoice_id:)
          response = with_port_errors { client.get("#{BASE_PATH}/#{provider_invoice_id}") }
          ResponseParser.parse_invoice(JSON.parse(response))
        end

        # NOTE: the collection-listing shape for `GET /cobranca/v3/cobrancas` (no id) was not
        # part of the single-resource endpoints confirmed for this PR. `dataInicial`/`dataFinal`
        # and a paginated `cobrancas` array are confirmed via an independent third-party
        # TypeScript client (lourenzoavelar/mcp-banco-inter, reverse-engineered against the live
        # API) since the official developers.inter.co portal renders client-side and could not
        # be fetched directly. Treat this method as moderately-, not firsthand-, confirmed; see
        # docs/open-questions.md.
        def list_invoices(since:, limit: 100)
          query = URI.encode_www_form(
            dataInicial: since.iso8601,
            dataFinal: Date.current.iso8601,
            tamanhoPagina: limit
          )
          response = with_port_errors { client.get("#{BASE_PATH}?#{query}") }
          payload = JSON.parse(response)
          Array(payload["cobrancas"]).map { |item| ResponseParser.parse_invoice(item) }
        end

        # `past_due_reissue: false` is deliberate: Inter's `PATCH /cobrancas/{id}` could edit
        # due date/amount, but that is not part of Gateways::BankSlip::Interface and no caller
        # needs it yet — not implemented in this PR.
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
        rescue SchoolLab::Integrations::Inter::Error, SchoolLab::Http::ConnectionError => error
          ErrorMapper.map(error)
        end

        def build_client(school)
          config = Registry.active_config(school: school)
          token_cache = SchoolLab::Integrations::Inter::TokenCache.new(
            school_id: school.id,
            provider: config.provider,
            token_url: SchoolLab::Integrations::Inter::Configuration.current.fetch(:token_url)
          )
          SchoolLab::Integrations::Inter::Client.new(
            client_id: config.client_id,
            client_secret: config.client_secret,
            certificate_pem: config.certificate_pem,
            private_key_pem: config.private_key_pem,
            token_cache: token_cache
          )
        end
      end
    end
  end
end
