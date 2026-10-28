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
            # Inter has no hosted boleto URL — the PDF is served on demand through
            # Adapter#boleto_pdf (`capabilities.boleto_pdf`), not stored as a URL.
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
          payer_cpf, payer_name = parse_payer(cobranca)

          ValueObjects::RemoteInvoice.new(
            provider_invoice_id: cobranca.fetch("codigoSolicitacao"),
            status: status,
            total_amount_cents: coerce_amount_cents(cobranca.fetch("valorNominal")),
            due_date: Date.iso8601(cobranca.fetch("dataVencimento")),
            payments: parse_payment(cobranca, pix: pix, status: status),
            boleto_url: nil,
            digitable_line: boleto["linhaDigitavel"],
            barcode: boleto["codigoBarras"],
            our_number: boleto["nossoNumero"],
            pix_emv: pix["pixCopiaECola"],
            payer_cpf: payer_cpf,
            payer_name: payer_name
          )
        end

        # `cobranca.pagador` on the GET response is inferred by analogy with the confirmed
        # POST request payload shape (`RequestPayload#payer_payload` sends `pagador.cpfCnpj` /
        # `.nome`) — developers.inter.co renders client-side and a real GET
        # /cobranca/v3/cobrancas/{id} response could not be fetched to confirm it carries the
        # same block back. Flagged in docs/open-questions.md as inferred, not firsthand-confirmed.
        # Defensive like `parse_payment`'s settlement-field fallback chain above, but unlike that
        # one a missing payer block is a legitimate, expected shape here — never raise, just nil.
        def parse_payer(cobranca)
          payer = cobranca["pagador"] || {}
          payer_cpf = FieldNormalizer.normalize_cpf(payer["cpfCnpj"])
          payer_name = payer["nome"]

          [ payer_cpf, payer_name ]
        end

        # Inter's GET response has no itemized payments array like Cora's — one aggregate
        # `valorTotalRecebido` + `origemRecebimento` + `dataSituacao` on the cobrança itself,
        # confirmed against this adapter's test fixtures. Those three top-level keys are
        # flagged in docs/open-questions.md as "inferred, not firsthand-confirmed" against a
        # real Inter sandbox/production payload — a real Pix-settled cobrança may carry the
        # paid amount/timestamp nested under `pix` instead. Fall back to a handful of
        # plausible `pix` keys before giving up, and raise a ProviderError (never a bare
        # KeyError) when the paid invoice genuinely carries neither, so the reconciliation
        # service's rescue clauses record and surface it instead of crashing the job invisibly.
        def parse_payment(cobranca, pix:, status:)
          return [] unless status == "paid"

          amount = paid_amount_raw(cobranca, pix)
          paid_at_value = paid_at_raw(cobranca, pix)
          if amount.nil? || paid_at_value.nil?
            raise ProviderError, missing_settlement_fields_message(cobranca, pix)
          end

          [
            ValueObjects::RemotePayment.new(
              provider_payment_id: payment_id(cobranca, paid_at_value),
              paid_amount_cents: coerce_amount_cents(amount),
              paid_at: parse_paid_at(paid_at_value),
              payment_method: normalize_payment_method(payment_method_raw(cobranca, pix))
            )
          ]
        end

        def paid_amount_raw(cobranca, pix)
          cobranca["valorTotalRecebido"] || pix["valor"] || pix["valorPago"]
        end

        def paid_at_raw(cobranca, pix)
          cobranca["dataSituacao"] || pix["dataHoraPagamento"] || pix["horario"] || pix["dataPagamento"]
        end

        # Falls back to "PIX" when the top-level field is absent but the `pix` sub-object
        # carries any data — the strongest available signal that settlement arrived via Pix
        # rather than boleto.
        def payment_method_raw(cobranca, pix)
          return cobranca["origemRecebimento"] if cobranca["origemRecebimento"].present?
          return "PIX" if pix.present? && pix.values.any?(&:present?)

          nil
        end

        def missing_settlement_fields_message(cobranca, pix)
          "Inter cobranca reported paid status but settlement amount/timestamp are missing " \
            "from both cobranca (keys: #{cobranca.keys.sort}) and pix (keys: #{pix.keys.sort})"
        end

        # There is no separate payment id in the response, unlike Cora/Fake. `provider_payment_id`
        # has a single global unique index across all providers (confirmed against
        # app/models/payment.rb and Billing::RecordPaymentService) so this provider-prefixed,
        # status-transition-scoped id is sufficient to avoid cross-provider collisions. Takes
        # the already-resolved settlement timestamp (not a bare `cobranca.fetch`) since it may
        # have come from the `pix` fallback in `paid_at_raw` instead of the cobrança itself.
        def payment_id(cobranca, paid_at_value)
          "inter-#{cobranca.fetch('codigoSolicitacao')}-#{paid_at_value}"
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
