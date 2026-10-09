# frozen_string_literal: true

module Gateways
  module BankSlip
    module Inter
      module RequestPayload
        # The longest window Inter allows before it auto-cancels an unpaid boleto. Our own
        # overdue handling (Billing::MarkOverdueChargesService) has no hard cutoff, so we give
        # Inter the longest window before it closes a boleto our platform still considers
        # payable.
        MAX_SCHEDULE_DAYS = 60

        # Confirmed in this PR's brief: a monthly interest rate maps to this code.
        MORA_CODE = "TAXAMENSAL"

        PAYMENT_METHODS = %w[BOLETO PIX].freeze

        PHONE_COUNTRY_PREFIX = "+55"

        module_function

        def from(issue_request)
          payload = {
            seuNumero: issue_request.charge_id&.to_s,
            valorNominal: amount_in_reais(issue_request.total_amount_cents),
            dataVencimento: issue_request.due_date.iso8601,
            numDiasAgenda: MAX_SCHEDULE_DAYS,
            pagador: payer_payload(issue_request.customer),
            formasRecebimento: PAYMENT_METHODS
          }

          mora = mora_payload(issue_request)
          payload[:mora] = mora if mora

          multa = multa_payload(issue_request)
          payload[:multa] = multa if multa

          desconto = desconto_payload(issue_request)
          payload[:desconto] = desconto if desconto

          payload.compact
        end

        # Rounded as BigDecimal (never raw Float division) to avoid the classic cents-to-reais
        # drift, then converted to Float only at this JSON boundary — same pattern the codebase
        # already uses for percent fields (e.g. `interest_rate_percent.to_f`) — so Inter receives
        # a JSON number, not a quoted string (ActiveSupport renders BigDecimal#to_json as a
        # string, which Inter would not parse as the numeric `valorNominal` it expects).
        def amount_in_reais(amount_cents)
          (amount_cents.to_d / 100).round(2).to_f
        end
        private_class_method :amount_in_reais

        def payer_payload(customer)
          ddd, telefone = phone_parts(customer.phone)

          data = {
            nome: customer.name,
            cpfCnpj: customer.document_number,
            tipoPessoa: "FISICA", # guardians are always individuals
            email: customer.email,
            ddd: ddd,
            telefone: telefone
          }
          data.merge!(address_payload(customer.address)) if customer.address

          data.compact
        end
        private_class_method :payer_payload

        def address_payload(address)
          {
            endereco: address.street,
            numero: address.number,
            complemento: address.complement,
            bairro: address.neighborhood,
            cidade: address.city,
            uf: address.state,
            cep: address.postal_code
          }
        end
        private_class_method :address_payload

        # Inter wants area code and number as separate fields, unlike Cora's single phone
        # string. `customer.phone` is already E.164-normalized by
        # Gateways::BankSlip::FieldNormalizer.normalize_phone_e164 (e.g. "+5511987654321"): strip
        # the country code, take the next 2 digits as `ddd`, the rest as `telefone`. A
        # blank/non-Brazilian-shaped phone returns nils rather than raising — the payer's phone
        # is optional on the boleto.
        def phone_parts(phone)
          return [ nil, nil ] if phone.blank?

          digits = phone.delete_prefix(PHONE_COUNTRY_PREFIX)
          return [ nil, nil ] if digits == phone
          return [ nil, nil ] unless digits.match?(/\A\d{10,11}\z/)

          [ digits[0, 2], digits[2..] ]
        end
        private_class_method :phone_parts

        # Issuance is already blocked upstream when a school has no interest rate configured
        # (Billing::IssueChargeService), so `mora` is present for essentially every Inter
        # issuance.
        def mora_payload(issue_request)
          return nil if issue_request.interest_rate_percent.blank?

          { taxa: issue_request.interest_rate_percent.to_f, codigo: MORA_CODE }
        end
        private_class_method :mora_payload

        # TODO: Inter's `multa.codigo` enum (fixed vs. percent fine) could not be confirmed with
        # confidence during this PR — the developers.inter.co portal renders client-side
        # (unreachable to automated fetch) and the independent references found did not document
        # the enum strings. Rather than guess a vendor code that could silently misconfigure a
        # real boleto's fine, `multa` is left unset; see docs/open-questions.md.
        def multa_payload(_issue_request)
          nil
        end
        private_class_method :multa_payload

        # TODO: same gap as multa_payload — `desconto.codigo` enum not confirmed. See
        # docs/open-questions.md.
        def desconto_payload(_issue_request)
          nil
        end
        private_class_method :desconto_payload
      end
    end
  end
end
