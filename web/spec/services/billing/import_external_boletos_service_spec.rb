# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::ImportExternalBoletosService do
  include ActiveSupport::Testing::TimeHelpers

  let(:school) { create(:school) }
  let(:adapter) { Gateways::BankSlip::Fake.new(school: school) }
  let(:pair) { OpensslCertificateHelper.generate_certificate_pair }
  let(:config) do
    create(:school_payment_provider,
           school: school,
           provider: "fake",
           certificate_pem: pair[:certificate_pem],
           private_key_pem: pair[:private_key_pem])
  end

  def payment_for(amount_cents: 85_000, paid_at: Time.current, method: "pix")
    Gateways::BankSlip::ValueObjects::RemotePayment.new(
      provider_payment_id: "pay-#{SecureRandom.hex(4)}",
      paid_amount_cents: amount_cents,
      paid_at: paid_at,
      payment_method: method
    )
  end

  describe "matched CPF" do
    it "creates exactly one charge per matched invoice, mapping each status correctly" do
      guardian = create(:guardian, school: school)
      adapter.seed_invoice!(provider_invoice_id: "inv-open", status: "open", total_amount_cents: 80_000,
                            due_date: 10.days.from_now.to_date, payer_cpf: guardian.cpf, payer_name: guardian.name)
      adapter.seed_invoice!(provider_invoice_id: "inv-late", status: "late", total_amount_cents: 81_000,
                            due_date: 10.days.from_now.to_date, payer_cpf: guardian.cpf, payer_name: guardian.name)
      adapter.seed_invoice!(provider_invoice_id: "inv-cancelled", status: "cancelled", total_amount_cents: 82_000,
                            due_date: 10.days.from_now.to_date, payer_cpf: guardian.cpf, payer_name: guardian.name)
      adapter.seed_invoice!(provider_invoice_id: "inv-paid", status: "paid", total_amount_cents: 83_000,
                            due_date: 10.days.from_now.to_date, payer_cpf: guardian.cpf, payer_name: guardian.name,
                            payments: [ payment_for(amount_cents: 83_000) ])

      result = described_class.call(config: config, adapter: adapter)

      expect(result).to be_success
      expect(result.data.fetch(:imported_count)).to eq(4)
      expect(Charge.where(school_id: school.id, source: "migrated").count).to eq(4)
      expect(Charge.find_by(external_reference: "inv-open")).to be_pending
      expect(Charge.find_by(external_reference: "inv-late")).to be_overdue
      expect(Charge.find_by(external_reference: "inv-cancelled")).to be_cancelled
      expect(Charge.find_by(external_reference: "inv-paid")).to be_paid
    end
  end

  describe "unmatched CPF" do
    it "skips the invoice without creating a charge, counting it as unmatched and logging it" do
      adapter.seed_invoice!(provider_invoice_id: "inv-unmatched", status: "open", total_amount_cents: 80_000,
                            due_date: 10.days.from_now.to_date, payer_cpf: "99988877766", payer_name: "Someone")
      allow(Rails.logger).to receive(:info)

      result = described_class.call(config: config, adapter: adapter)

      expect(result).to be_success
      expect(result.data.fetch(:unmatched_count)).to eq(1)
      expect(result.data.fetch(:imported_count)).to eq(0)
      expect(Charge.count).to eq(0)
      expect(Rails.logger).to have_received(:info).with(include("billing.import_external_boletos.unmatched_payer_cpf"))
    end

    it "imports the invoice on a later run once a guardian with that CPF exists" do
      guardian = build(:guardian, school: school)
      adapter.seed_invoice!(provider_invoice_id: "inv-later", status: "open", total_amount_cents: 80_000,
                            due_date: 10.days.from_now.to_date, payer_cpf: guardian.cpf, payer_name: "Someone")
      described_class.call(config: config, adapter: adapter)
      expect(Charge.count).to eq(0)

      guardian.save!
      result = described_class.call(config: config, adapter: adapter)

      expect(result.data.fetch(:imported_count)).to eq(1)
      expect(Charge.find_by(external_reference: "inv-later")).to be_present
    end
  end

  describe "already-known invoices" do
    it "never re-imports an invoice already known via ChargeIssuance" do
      charge = create(:charge, school: school)
      create(:charge_issuance, charge: charge, school: school, provider_invoice_id: "inv-issued")
      adapter.seed_invoice!(provider_invoice_id: "inv-issued", status: "open", total_amount_cents: 80_000,
                            due_date: 10.days.from_now.to_date, payer_cpf: "99988877766", payer_name: "Someone")

      result = described_class.call(config: config, adapter: adapter)

      expect(result.data.fetch(:skipped_count)).to eq(1)
      expect(result.data.fetch(:imported_count)).to eq(0)
      expect(result.data.fetch(:unmatched_count)).to eq(0)
      expect(Charge.count).to eq(1)
    end

    it "never re-imports an invoice already known via Charge#external_reference" do
      create(:charge, school: school, source: "migrated", external_reference: "inv-already-migrated")
      adapter.seed_invoice!(provider_invoice_id: "inv-already-migrated", status: "open", total_amount_cents: 80_000,
                            due_date: 10.days.from_now.to_date, payer_cpf: "99988877766", payer_name: "Someone")

      result = described_class.call(config: config, adapter: adapter)

      expect(result.data.fetch(:skipped_count)).to eq(1)
      expect(Charge.where(school_id: school.id, source: "migrated").count).to eq(1)
    end
  end

  describe "draft invoices" do
    it "skips a draft-status invoice entirely — no charge" do
      adapter.seed_invoice!(provider_invoice_id: "inv-draft", status: "draft", total_amount_cents: 80_000,
                            due_date: 10.days.from_now.to_date, payer_cpf: "99988877766", payer_name: "Someone")

      result = described_class.call(config: config, adapter: adapter)

      expect(result.data.fetch(:skipped_count)).to eq(1)
      expect(Charge.count).to eq(0)
    end
  end

  describe "multi-tenancy" do
    it "never matches a CPF belonging to a guardian at a different school" do
      other_school = create(:school)
      other_guardian = create(:guardian, school: other_school)
      adapter.seed_invoice!(provider_invoice_id: "inv-cross-school", status: "open", total_amount_cents: 80_000,
                            due_date: 10.days.from_now.to_date, payer_cpf: other_guardian.cpf, payer_name: "Cross School")

      result = described_class.call(config: config, adapter: adapter)

      expect(result.data.fetch(:imported_count)).to eq(0)
      expect(result.data.fetch(:unmatched_count)).to eq(1)
      expect(Charge.where(source: "migrated").count).to eq(0)
    end
  end

  describe "one-time backfill anchor resolution" do
    it "anchors to the earliest school_payment_providers.uploaded_at when present" do
      uploaded_at = 400.days.ago
      config.update!(uploaded_at: uploaded_at)

      expect(adapter).to receive(:list_invoices).with(since: uploaded_at.to_date, limit: anything).and_call_original

      described_class.call(config: config, adapter: adapter)
    end

    it "falls back to the earliest ChargeIssuance for the provider when uploaded_at is absent" do
      config.update!(uploaded_at: nil)
      issuance_created_at = 200.days.ago
      charge = create(:charge, school: school)
      issuance = create(:charge_issuance, charge: charge, school: school, provider: "fake")
      issuance.update_column(:created_at, issuance_created_at) # rubocop:disable Rails/SkipsModelValidations

      expect(adapter).to receive(:list_invoices).with(since: issuance_created_at.to_date, limit: anything).and_call_original

      described_class.call(config: config, adapter: adapter)
    end

    it "falls back to the school's own created_at when neither is present" do
      config.update!(uploaded_at: nil)

      expect(adapter).to receive(:list_invoices).with(since: school.created_at.to_date, limit: anything).and_call_original

      described_class.call(config: config, adapter: adapter)
    end
  end

  describe "watermark" do
    it "advances last_external_import_at after a successful run" do
      expect(config.last_external_import_at).to be_nil

      travel_to(Time.zone.local(2026, 11, 1, 12, 0, 0)) do
        described_class.call(config: config, adapter: adapter)
      end

      expect(config.reload.last_external_import_at).to eq(Time.zone.local(2026, 11, 1, 12, 0, 0))
    end

    it "uses the watermark (minus the overlap) as since on the next incremental run" do
      config.update!(last_external_import_at: 10.days.ago)
      expected_since = (10.days.ago - described_class::OVERLAP_DAYS.days).to_date

      expect(adapter).to receive(:list_invoices).with(since: expected_since, limit: anything).and_call_original

      described_class.call(config: config, adapter: adapter)
    end
  end
end
