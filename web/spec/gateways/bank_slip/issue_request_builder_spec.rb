# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::BankSlip::IssueRequestBuilder do
  include ActiveSupport::Testing::TimeHelpers
  let(:school) { create(:school) }
  let(:guardian) do
    create(
      :guardian,
      school: school,
      name: "Maria Silva",
      cpf: "123.456.789-09",
      email: "maria@example.com",
      phone: "(11) 98765-4321"
    )
  end
  # A charge the provider would accept: the builder rejects a due date already in the past, so
  # this stays ahead of whatever the clock reads. An absolute date instead turns every example
  # below into a failure once the real calendar passes it.
  let(:due_date) { 30.days.from_now.to_date }
  let(:charge) do
    create(
      :charge,
      school: school,
      guardian: guardian,
      total_amount_cents: 150_000,
      due_date: due_date
    )
  end
  let!(:billing_settings) { create(:school_billing_settings, :issuance_ready, school: school) }

  def stub_guardian_address(guardian, **attrs)
    attrs.each do |field, value|
      guardian.define_singleton_method(field) { value }
    end
  end

  describe ".from_charge" do
    it "maps a complete charge to a valid issue request" do
      stub_guardian_address(
        guardian,
        street: "Rua das Flores",
        number: "100",
        neighborhood: "Centro",
        city: "Sao Paulo",
        state: "SP",
        zip_code: "01310-100"
      )

      request = described_class.from_charge(charge)

      expect(request.total_amount_cents).to eq(150_000)
      expect(request.due_date).to eq(due_date)
      expect(request.customer.name).to eq("Maria Silva")
      expect(request.customer.document_number).to eq("12345678909")
      expect(request.customer.email).to eq("maria@example.com")
      expect(request.customer.phone).to eq("+5511987654321")
      expect(request.customer.address).to be_a(Gateways::BankSlip::ValueObjects::Address)
      expect(request.service_description).to eq(I18n.t("billing.settings.default_service_description"))
      expect(request.interest_rate_percent).to eq(BigDecimal("1.0"))
    end

    # A one-off names what it is for, and that reason is what the payer was shown when it was
    # raised. Billing it as "Mensalidade escolar" describes the wrong thing.
    it "bills a charge under its own description when it has one" do
      charge.update!(description: "Excursão pedagógica")

      request = described_class.from_charge(charge)

      expect(request.service_description).to eq("Excursão pedagógica")
    end

    it "falls back to the school's description when the charge names no reason" do
      charge.update!(description: nil)

      request = described_class.from_charge(charge)

      expect(request.service_description).to eq(I18n.t("billing.settings.default_service_description"))
    end

    # The explicit argument is the caller overruling both, and it still wins.
    it "lets an explicit description overrule the charge's own" do
      charge.update!(description: "Excursão pedagógica")

      request = described_class.from_charge(charge, service_description: "Segunda via")

      expect(request.service_description).to eq("Segunda via")
    end

    it "truncates over-long text without corrupting multi-byte characters" do
      guardian.update!(name: "Á" * 80, email: "#{'a' * 70}@example.com")

      request = described_class.from_charge(charge, service_description: "Ç" * 120)

      expect(request.customer.name.length).to eq(60)
      expect(request.customer.name).to eq("Á" * 60)
      expect(request.customer.email.length).to eq(60)
      expect(request.service_description.length).to eq(100)
      expect(request.service_description).to eq("Ç" * 100)
    end

    it "normalizes documents and phones" do
      request = described_class.from_charge(charge)

      expect(request.customer.document_number).to eq("12345678909")
      expect(request.customer.phone).to eq("+5511987654321")
    end

    it "omits a phone that cannot be normalized" do
      guardian.update!(phone: "invalid")

      request = described_class.from_charge(charge)

      expect(request.customer.phone).to be_nil
    end

    it "omits an incomplete address entirely" do
      stub_guardian_address(
        guardian,
        street: "Rua das Flores",
        number: "100",
        neighborhood: "Centro",
        city: "Sao Paulo",
        state: "SP",
        zip_code: nil
      )

      request = described_class.from_charge(charge)

      expect(request.customer.address).to be_nil
    end

    it "rejects amounts below the provider minimum" do
      charge.update!(total_amount_cents: 400)

      expect { described_class.from_charge(charge) }
        .to raise_error(Gateways::BankSlip::ValidationError, /at least 500/)
    end

    it "accepts the minimum amount" do
      charge.update!(total_amount_cents: 500)

      expect { described_class.from_charge(charge) }.not_to raise_error
    end

    it "rejects due dates in the past using the school timezone" do
      travel_to Time.utc(2026, 4, 11, 3, 0, 0) do
        charge.update!(due_date: Date.new(2026, 4, 10))

        expect { described_class.from_charge(charge) }
          .to raise_error(Gateways::BankSlip::ValidationError, /due_date cannot be in the past/)
      end
    end

    it "accepts a charge due today in the school timezone" do
      travel_to Time.utc(2026, 4, 10, 3, 0, 0) do
        charge.update!(due_date: Date.new(2026, 4, 10))

        expect { described_class.from_charge(charge) }.not_to raise_error
      end
    end

    it "rejects a guardian missing a CPF" do
      # CPF is required on the model now, so a blank one can only reach here as a legacy row
      # predating that rule — which is exactly what the builder must still refuse to send.
      guardian.update_column(:cpf, nil)

      expect { described_class.from_charge(charge) }
        .to raise_error(Gateways::BankSlip::ValidationError, /document_number is required/)
    end

    it "maps billing settings for discount and fine into the issue request" do
      billing_settings.update!(
        early_payment_discount_percent: 5.0,
        early_payment_discount_day: 5,
        fine_type: "percent",
        fine_rate_percent: 2.0
      )

      request = described_class.from_charge(charge)

      expect(request.early_payment_discount_percent).to eq(BigDecimal("5.0"))
      expect(request.fine_type).to eq("percent")
      expect(request.fine_rate_percent).to eq(BigDecimal("2.0"))
      expect(request.fine_amount_cents).to be_nil
    end

    it "maps fixed fine settings into the issue request" do
      billing_settings.update!(fine_type: "fixed", fine_amount_cents: 1500)

      request = described_class.from_charge(charge)

      expect(request.fine_type).to eq("fixed")
      expect(request.fine_amount_cents).to eq(1500)
      expect(request.fine_rate_percent).to be_nil
    end

    it "uses localized billing strings rather than hardcoded Portuguese" do
      source = File.read(Rails.root.join("app/services/gateways/bank_slip/issue_request_builder.rb"))

      expect(source).not_to match(/Mensalidade|mensalidade/)
      expect(I18n.t("billing.settings.default_service_description")).to be_present
    end
  end
end
