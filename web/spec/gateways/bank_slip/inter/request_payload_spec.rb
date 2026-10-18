# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::BankSlip::Inter::RequestPayload do
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
        charge_id: 42,
        interest_rate_percent: BigDecimal("1.0")
      }.merge(overrides)
    )
  end

  describe "amount" do
    it "sends the amount as decimal reais, not integer cents" do
      payload = described_class.from(build_request(total_amount_cents: 85_051))

      expect(payload[:valorNominal]).to eq(850.51)
    end

    it "rounds to two decimal places" do
      payload = described_class.from(build_request(total_amount_cents: 1))

      expect(payload[:valorNominal]).to eq(0.01)
    end
  end

  describe "pagador" do
    it "carries the document as cpfCnpj with tipoPessoa FISICA" do
      payload = described_class.from(build_request)

      expect(payload[:pagador][:cpfCnpj]).to eq("12345678901")
      expect(payload[:pagador][:tipoPessoa]).to eq("FISICA")
    end

    it "splits the phone into ddd and telefone instead of a single field" do
      payload = described_class.from(build_request)

      expect(payload[:pagador][:ddd]).to eq("11")
      expect(payload[:pagador][:telefone]).to eq("987654321")
      expect(payload[:pagador]).not_to have_key(:telephone)
      expect(payload[:pagador]).not_to have_key(:phone)
    end

    it "returns nil ddd/telefone for a blank phone instead of raising" do
      payload = described_class.from(build_request(customer: customer.with(phone: nil)))

      expect(payload[:pagador]).not_to have_key(:ddd)
      expect(payload[:pagador]).not_to have_key(:telefone)
    end

    it "maps the address to Inter's field names" do
      payload = described_class.from(build_request)

      expect(payload[:pagador]).to include(
        endereco: "Rua das Flores",
        numero: "100",
        bairro: "Centro",
        cidade: "Sao Paulo",
        uf: "SP",
        cep: "01310-100"
      )
    end

    it "omits address fields when the payer has none" do
      payload = described_class.from(build_request(customer: customer.with(address: nil)))

      expect(payload[:pagador]).not_to have_key(:endereco)
      expect(payload[:pagador]).not_to have_key(:cep)
    end
  end

  describe "mora" do
    it "sends a monthly interest rate under codigo TAXAMENSAL" do
      payload = described_class.from(build_request(interest_rate_percent: BigDecimal("2.0")))

      expect(payload[:mora]).to eq(taxa: 2.0, codigo: "TAXAMENSAL")
    end

    it "omits mora when the school has no interest rate configured" do
      payload = described_class.from(build_request(interest_rate_percent: nil))

      expect(payload).not_to have_key(:mora)
    end
  end

  describe "multa and desconto (not confirmed in this PR — see docs/open-questions.md)" do
    it "omits multa even when a fine is configured, pending enum confirmation" do
      payload = described_class.from(build_request(fine_type: "percent", fine_rate_percent: BigDecimal("2.0")))

      expect(payload).not_to have_key(:multa)
    end

    it "omits desconto even when an early payment discount is configured, pending enum confirmation" do
      payload = described_class.from(build_request(early_payment_discount_percent: BigDecimal("5.0")))

      expect(payload).not_to have_key(:desconto)
    end
  end

  describe "the rest of the cobrança" do
    it "sends the charge id as seuNumero so the two can be reconciled" do
      payload = described_class.from(build_request)

      expect(payload[:seuNumero]).to eq("42")
    end

    it "sends the due date in ISO 8601" do
      payload = described_class.from(build_request)

      expect(payload[:dataVencimento]).to eq("2026-12-10")
    end

    it "requests the maximum schedule window before auto-cancellation" do
      payload = described_class.from(build_request)

      expect(payload[:numDiasAgenda]).to eq(60)
    end

    it "offers both a boleto and a Pix" do
      payload = described_class.from(build_request)

      expect(payload[:formasRecebimento]).to eq(%w[BOLETO PIX])
    end
  end
end
