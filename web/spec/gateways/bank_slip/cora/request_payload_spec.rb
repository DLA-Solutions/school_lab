# frozen_string_literal: true

require "rails_helper"

# Guards the shape Cora's /v2/invoices/ endpoint actually accepts. It rejects a malformed body
# with an empty 400 — no message, no field name — so a payload regression is invisible from the
# response alone and only shows up as boletos that stop being issued. Every expectation here
# was confirmed against the live API.
RSpec.describe Gateways::BankSlip::Cora::RequestPayload do
  let(:address) do
    Gateways::BankSlip::ValueObjects::Address.new(
      street: "Rua das Flores",
      number: "100",
      complement: nil,
      neighborhood: "Centro",
      city: "Sao Paulo",
      state: "SP",
      postal_code: "01310-100"
    )
  end

  let(:customer) do
    Gateways::BankSlip::ValueObjects::Customer.new(
      name: "Maria Silva",
      document_number: "12345678901",
      email: "maria@example.com",
      phone: "+5511987654321",
      address: address
    )
  end

  def build_request(customer: nil, **overrides)
    Gateways::BankSlip::ValueObjects::IssueRequest.new(
      **{
        idempotency_key: "idempotent-key-123",
        total_amount_cents: 85_000,
        due_date: Date.new(2026, 12, 10),
        customer: customer || self.customer,
        service_description: "Mensalidade escolar",
        school_id: 1,
        charge_id: 42
      }.merge(overrides)
    )
  end

  describe "customer" do
    it "carries the document as a CPF pair" do
      payload = described_class.from(build_request)

      expect(payload[:customer][:document]).to eq(identity: "12345678901", type: "CPF")
    end

    # Cora has no `telephone` field on the customer — sending one is rejected outright, and the
    # payer's phone belongs in the notification channels instead.
    it "does not send a telephone on the customer" do
      payload = described_class.from(build_request)

      expect(payload[:customer]).not_to have_key(:telephone)
    end

    it "maps the address to Cora's field names" do
      payload = described_class.from(build_request)

      expect(payload[:customer][:address]).to eq(
        street: "Rua das Flores",
        number: "100",
        district: "Centro",
        city: "Sao Paulo",
        state: "SP",
        complement: "N/A",
        zip_code: "01310-100"
      )
    end

    it "omits the address when the payer has none" do
      payload = described_class.from(build_request(customer: customer.with(address: nil)))

      expect(payload[:customer]).not_to have_key(:address)
    end
  end

  describe "notification" do
    it "opens a channel per contact the payer has" do
      payload = described_class.from(build_request)

      expect(payload[:notification][:channels]).to contain_exactly(
        hash_including(channel: "EMAIL", contact: "maria@example.com"),
        hash_including(channel: "SMS", contact: "+5511987654321")
      )
    end

    # A channel without `rules` is refused with the same empty 400 as a malformed body.
    it "gives every channel its notification rules" do
      payload = described_class.from(build_request)

      expect(payload[:notification][:channels]).to all(
        include(rules: be_present)
      )
    end

    it "drops the SMS channel when the payer has no phone" do
      payload = described_class.from(build_request(customer: customer.with(phone: nil)))

      expect(payload[:notification][:channels].map { |c| c[:channel] }).to eq(%w[EMAIL])
    end

    it "omits the notification block entirely when there is nobody to reach" do
      unreachable = customer.with(email: nil, phone: nil)

      payload = described_class.from(build_request(customer: unreachable))

      expect(payload).not_to have_key(:notification)
    end
  end

  describe "payment terms" do
    it "sends the due date alone when the school charges no interest or discount" do
      payload = described_class.from(build_request)

      expect(payload[:payment_terms]).to eq(due_date: "2026-12-10")
    end

    it "adds interest and an early payment discount when configured" do
      payload = described_class.from(
        build_request(interest_rate_percent: BigDecimal("2.0"),
                      early_payment_discount_percent: BigDecimal("10.0"))
      )

      expect(payload[:payment_terms]).to include(
        interest: { rate: 2.0 },
        discount: { type: "PERCENT", value: 10.0 }
      )
    end

    it "sends a percent fine as a rate" do
      payload = described_class.from(build_request(fine_type: "percent", fine_rate_percent: BigDecimal("2.0")))

      expect(payload[:payment_terms][:fine]).to eq(rate: 2.0)
    end

    it "sends a fixed fine as an amount in cents" do
      payload = described_class.from(build_request(fine_type: "fixed", fine_amount_cents: 500))

      expect(payload[:payment_terms][:fine]).to eq(amount: 500)
    end

    it "omits the fine when its type carries no value" do
      payload = described_class.from(build_request(fine_type: "percent", fine_rate_percent: nil))

      expect(payload[:payment_terms]).not_to have_key(:fine)
    end
  end

  describe "the rest of the invoice" do
    it "bills a single service for the charge total" do
      payload = described_class.from(build_request)

      expect(payload[:services]).to eq(
        [ { name: "Mensalidade escolar", description: "Mensalidade escolar", amount: 85_000 } ]
      )
    end

    it "offers both a boleto and a PIX" do
      payload = described_class.from(build_request)

      expect(payload[:payment_forms]).to eq(%w[BANK_SLIP PIX])
    end

    it "sends the charge id as the invoice code so the two can be reconciled" do
      payload = described_class.from(build_request)

      expect(payload[:code]).to eq("42")
    end
  end
end
