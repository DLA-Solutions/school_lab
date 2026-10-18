# frozen_string_literal: true

module Gateways
  module BankSlip
    module Inter
      module ResponseParser
        STATUS_MAPPING = {
          "EM_PROCESSAMENTO" => "draft",
          "A_RECEBER"        => "open",
          "RECEBIDO"         => "paid",
          "MARCADO_RECEBIDO" => "paid",
          "ATRASADO"         => "late",
          "PROTESTO"         => "late",      # overdue + flagged for legal protest; still fundamentally an unpaid overdue charge
          "CANCELADO"        => "cancelled",
          "EXPIRADO"         => "cancelled", # hard expiry after numDiasAgenda days past due — no longer collectible, closest fit is "cancelled"
          "FALHA_EMISSAO"    => "cancelled"  # emission permanently failed at the vendor — will never become payable, closest fit is "cancelled"
        }.freeze

        module_function

        # Used only by adapter#issue: the synchronous POST /cobrancas response is just
        # `{"codigoSolicitacao": "..."}` — none of the presentation fields exist yet (see
        # ValueObjects::Issuance). Status is the literal "draft": nothing has happened at the
        # bank yet, so there is no provider status token to run through StatusNormalizer.
        def parse_pending_issuance(codigo_solicitacao:, amount_cents:)
          ValueObjects::Issuance.new(
            provider_invoice_id: codigo_solicitacao,
            status: "draft",
            amount_cents: amount_cents
          )
        end

        # Used only by adapter#cancel, against the full GET /cobrancas/{id} response shape
        # (`{cobranca:, boleto:, pix:}`), mirroring Cora's parse_issuance.
        def parse_issuance(payload)
          cobranca = payload.fetch("cobranca")
          boleto = payload["boleto"] || {}
          pix = payload["pix"] || {}

          ValueObjects::Issuance.new(
            provider_invoice_id: cobranca.fetch("codigoSolicitacao"),
            status: normalize_status(cobranca.fetch("situacao")),
            amount_cents: coerce_amount_cents(cobranca.fetch("valorNominal")),
            # Inter has no direct boleto PDF/URL field in this response — only a separate
            # base64 `GET .../pdf` endpoint, which is out of scope for this PR.
            boleto_url: nil,
            digitable_line: boleto["linhaDigitavel"],
            barcode: boleto["codigoBarras"],
            our_number: boleto["nossoNumero"],
            pix_emv: pix["pixCopiaECola"]
          )
        end

        def parse_invoice(payload)
          cobranca = payload.fetch("cobranca")
          boleto = payload["boleto"] || {}
          pix = payload["pix"] || {}
          status = normalize_status(cobranca.fetch("situacao"))

          ValueObjects::RemoteInvoice.new(
            provider_invoice_id: cobranca.fetch("codigoSolicitacao"),
            status: status,
            total_amount_cents: coerce_amount_cents(cobranca.fetch("valorNominal")),
            due_date: Date.iso8601(cobranca.fetch("dataVencimento")),
            payments: parse_payment(cobranca, status: status),
            boleto_url: nil,
            digitable_line: boleto["linhaDigitavel"],
            barcode: boleto["codigoBarras"],
            our_number: boleto["nossoNumero"],
            pix_emv: pix["pixCopiaECola"]
          )
        end

        # Inter's GET response has no itemized payments array like Cora's — one aggregate
        # `valorTotalRecebido` + `origemRecebimento` + `dataSituacao` on the cobrança itself.
        # Only synthesized when the normalized status is "paid"; otherwise there is nothing
        # collected yet.
        def parse_payment(cobranca, status:)
          return [] unless status == "paid"

          [
            ValueObjects::RemotePayment.new(
              provider_payment_id: payment_id(cobranca),
              paid_amount_cents: coerce_amount_cents(cobranca.fetch("valorTotalRecebido")),
              paid_at: parse_paid_at(cobranca.fetch("dataSituacao")),
              payment_method: normalize_payment_method(cobranca["origemRecebimento"])
            )
          ]
        end

        # There is no separate payment id in the response, unlike Cora/Fake. `provider_payment_id`
        # has a single global unique index across all providers (confirmed against
        # app/models/payment.rb and Billing::RecordPaymentService) so this provider-prefixed,
        # status-transition-scoped id is sufficient to avoid cross-provider collisions.
        def payment_id(cobranca)
          "inter-#{cobranca.fetch('codigoSolicitacao')}-#{cobranca.fetch('dataSituacao')}"
        end

        def parse_paid_at(data_situacao)
          Time.zone.parse(data_situacao)
        end

        def normalize_status(provider_status)
          StatusNormalizer.normalize(provider_status, mapping: STATUS_MAPPING)
        end

        # BOLETO/PIX, by analogy with the confirmed `formasRecebimento` vocabulary Inter uses
        # elsewhere on the same resource (see RequestPayload::PAYMENT_METHODS) — Inter's own
        # list/search endpoint documentation was not reachable to double-check this specific
        # field during this PR; see docs/open-questions.md.
        def normalize_payment_method(origem)
          case origem.to_s.upcase
          when "PIX" then "pix"
          when "BOLETO" then "boleto"
          else origem.to_s.downcase
          end
        end

        # Inter reports amounts as decimal reais (e.g. "850.00"), not integer cents like Cora —
        # convert via BigDecimal, never a plain Integer() coercion.
        def coerce_amount_cents(value)
          (BigDecimal(value.to_s) * 100).round.to_i
        rescue ArgumentError, TypeError
          raise ProviderError, "Invalid amount from provider"
        end
      end
    end
  end
end
