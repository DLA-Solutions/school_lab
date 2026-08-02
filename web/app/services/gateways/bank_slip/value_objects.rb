# frozen_string_literal: true

module Gateways
  module BankSlip
    module ValueObjects
      module IntegerCents
        module_function

        def coerce!(value, attribute_name)
          raise ArgumentError, "#{attribute_name} must be an Integer, got #{value.class}" if value.is_a?(BigDecimal)
          raise ArgumentError, "#{attribute_name} must be an Integer" unless value.is_a?(Integer)

          value
        end
      end

      Address = Data.define(:street, :number, :complement, :neighborhood, :city, :state, :postal_code) do
        def initialize(*)
          super
        end
      end

      Customer = Data.define(:name, :document_number, :email, :phone, :address) do
        def initialize(name:, document_number:, email: nil, phone: nil, address: nil)
          super
        end
      end

      IssueRequest = Data.define(
        :idempotency_key,
        :total_amount_cents,
        :due_date,
        :customer,
        :service_description,
        :school_id,
        :charge_id
      ) do
        def initialize(idempotency_key:, total_amount_cents:, due_date:, customer:, service_description: nil,
                       school_id: nil, charge_id: nil)
          super(
            idempotency_key: idempotency_key,
            total_amount_cents: IntegerCents.coerce!(total_amount_cents, :total_amount_cents),
            due_date: due_date,
            customer: customer,
            service_description: service_description,
            school_id: school_id,
            charge_id: charge_id
          )
        end
      end

      Issuance = Data.define(
        :provider_invoice_id,
        :boleto_url,
        :digitable_line,
        :barcode,
        :our_number,
        :pix_emv,
        :status,
        :amount_cents
      ) do
        def initialize(provider_invoice_id:, boleto_url:, digitable_line:, barcode:, our_number:, pix_emv:, status:,
                       amount_cents: nil)
          StatusNormalizer::INTERNAL_STATUSES.include?(status.to_s) || raise(ArgumentError, "invalid status: #{status}")

          super(
            provider_invoice_id: provider_invoice_id,
            boleto_url: boleto_url,
            digitable_line: digitable_line,
            barcode: barcode,
            our_number: our_number,
            pix_emv: pix_emv,
            status: status,
            amount_cents: amount_cents.nil? ? nil : IntegerCents.coerce!(amount_cents, :amount_cents)
          )
        end
      end

      RemotePayment = Data.define(
        :provider_payment_id,
        :paid_amount_cents,
        :paid_at,
        :payment_method,
        :fine_amount_cents,
        :interest_amount_cents
      ) do
        def initialize(provider_payment_id:, paid_amount_cents:, paid_at:, payment_method:,
                       fine_amount_cents: 0, interest_amount_cents: 0)
          super(
            provider_payment_id: provider_payment_id,
            paid_amount_cents: IntegerCents.coerce!(paid_amount_cents, :paid_amount_cents),
            paid_at: paid_at,
            payment_method: payment_method,
            fine_amount_cents: IntegerCents.coerce!(fine_amount_cents, :fine_amount_cents),
            interest_amount_cents: IntegerCents.coerce!(interest_amount_cents, :interest_amount_cents)
          )
        end
      end

      RemoteInvoice = Data.define(
        :provider_invoice_id,
        :status,
        :total_amount_cents,
        :due_date,
        :payments
      ) do
        def initialize(provider_invoice_id:, status:, total_amount_cents:, due_date:, payments: [])
          StatusNormalizer::INTERNAL_STATUSES.include?(status.to_s) || raise(ArgumentError, "invalid status: #{status}")

          super(
            provider_invoice_id: provider_invoice_id,
            status: status.to_s,
            total_amount_cents: IntegerCents.coerce!(total_amount_cents, :total_amount_cents),
            due_date: due_date,
            payments: payments
          )
        end
      end

      Event = Data.define(
        :provider,
        :provider_event_id,
        :event_type,
        :provider_resource_id,
        :payload
      )
    end
  end
end
