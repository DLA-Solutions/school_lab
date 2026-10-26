# frozen_string_literal: true

require "rails_helper"

RSpec.describe Charge, type: :model do
  let(:school) { create(:school) }
  let(:guardian) { create(:guardian, school: school) }
  let(:student) { create(:student, school: school) }
  let(:billing_plan) { create(:billing_plan, school: school) }
  let(:contract) { create(:contract, school: school, student: student, billing_plan: billing_plan) }

  describe "AASM timestamps" do
    it "sets paid_at when transitioning to paid" do
      charge = create(:charge, school: school, contract: contract, guardian: guardian)

      charge.pay!

      expect(charge.reload.paid_at).to be_present
    end
  end

  describe "listing scopes" do
    let!(:early) do
      create(:charge, school: school, contract: contract, guardian: guardian, due_date: Date.new(2026, 3, 10))
    end
    let!(:late) do
      create(:charge, :paid, school: school, contract: contract, guardian: guardian,
                             due_date: Date.new(2026, 5, 10))
    end
    let!(:undated) do
      create(:charge, school: school, contract: contract, guardian: guardian, due_date: nil)
    end

    it "filters by one or several statuses" do
      expect(described_class.with_status("paid")).to contain_exactly(late)
      expect(described_class.with_status(%w[paid pending])).to contain_exactly(early, late, undated)
    end

    it "bounds the due date inclusively and ignores a missing bound" do
      expect(described_class.due_between(Date.new(2026, 3, 10), Date.new(2026, 5, 10))).to contain_exactly(early, late)
      expect(described_class.due_between(Date.new(2026, 3, 11), nil)).to contain_exactly(late)
      expect(described_class.due_between(nil, Date.new(2026, 3, 10))).to contain_exactly(early)
      expect(described_class.due_between).to contain_exactly(early, late, undated)
    end

    it "orders by due date with undated charges last in both directions" do
      expect(described_class.by_due_date.to_a).to eq([ late, early, undated ])
      expect(described_class.by_due_date(:asc).to_a).to eq([ early, late, undated ])
    end
  end

  describe "database constraints" do
    it "rejects negative total_amount_cents" do
      charge = build(:charge, school: school, contract: contract, guardian: guardian,
                              total_amount_cents: -100)

      expect { charge.save(validate: false) }.to raise_error(ActiveRecord::StatementInvalid)
    end

    it "rejects rows without total_amount_cents" do
      expect do
        Charge.insert!({
                         contract_id: contract.id,
                         school_id: school.id,
                         guardian_id: guardian.id,
                         billing_period: Date.new(2026, 8, 1),
                         original_amount_cents: 100,
                         discount_amount_cents: 0,
                         late_fee_amount_cents: 0,
                         status: "pending",
                         created_at: Time.current,
                         updated_at: Time.current
                       })
      end.to raise_error(ActiveRecord::NotNullViolation)
    end
  end

  describe "#current_issuance" do
    it "returns the most recent non-cancelled issuance and syncs the charge cache" do
      charge = create(:charge, school: school, contract: contract, guardian: guardian)
      cancelled = create(:charge_issuance, :issued, charge: charge, school: school,
                                                     provider_invoice_id: "inv-cancelled",
                                                     created_at: 2.days.ago)
      cancelled.cancel!

      current = create(:charge_issuance, :issued, charge: charge, school: school,
                                                   provider_invoice_id: "inv-current",
                                                   created_at: 1.day.ago)
      charge.sync_invoice_cache!

      expect(charge.current_issuance).to eq(current)
      expect(charge.provider_invoice_id).to eq("inv-current")
      expect(charge.boleto_url).to eq(current.boleto_url)
      expect(charge.pix_copy_paste).to eq(current.pix_emv)
      expect(charge.charge_issuances.where(status: "cancelled").count).to eq(1)
    end
  end

  describe "#current_issuance with preloaded issuances" do
    it "picks the same issuance without querying" do
      charge = create(:charge, school: school, contract: contract, guardian: guardian)
      create(:charge_issuance, :issued, charge: charge, school: school, provider_invoice_id: "inv-old",
                                        created_at: 2.days.ago).cancel!
      current = create(:charge_issuance, :issued, charge: charge, school: school,
                                                  provider_invoice_id: "inv-current", created_at: 1.day.ago)
      preloaded = described_class.includes(:charge_issuances).find(charge.id)

      queries = []
      callback = ->(*, payload) { queries << payload[:sql] unless payload[:name] == "SCHEMA" }
      ActiveSupport::Notifications.subscribed(callback, "sql.active_record") do
        expect(preloaded.current_issuance).to eq(current)
      end

      expect(queries).to be_empty
    end
  end

  describe "#boleto_pdf_available?" do
    let(:charge) { create(:charge, school: school, contract: contract, guardian: guardian) }

    def issue(provider:, **fields)
      create(:charge_issuance, :issued, charge: charge, school: school, provider: provider, **fields)
    end

    it "is true for a payable charge whose Inter boleto is registered" do
      issue(provider: "inter")

      expect(charge).to be_boleto_pdf_available
    end

    it "is false while Inter has not produced the boleto yet" do
      issue(provider: "inter", digitable_line: nil, pix_emv: nil)

      expect(charge).not_to be_boleto_pdf_available
    end

    it "is false for a provider that serves a hosted boleto_url instead (Cora)" do
      issue(provider: "cora")

      expect(charge).not_to be_boleto_pdf_available
    end

    it "is false once the charge is paid, cancelled or discarded" do
      issue(provider: "inter")
      expect(charge).to be_boleto_pdf_available

      charge.pay!
      expect(charge).not_to be_boleto_pdf_available
    end

    it "is false for a cancelled charge and a discarded one" do
      issue(provider: "inter")
      charge.cancel!
      expect(charge).not_to be_boleto_pdf_available

      other = create(:charge, school: school, contract: contract, guardian: guardian)
      create(:charge_issuance, :issued, charge: other, school: school, provider: "inter")
      other.discard
      expect(other).not_to be_boleto_pdf_available
    end

    it "is false without any issuance" do
      expect(charge).not_to be_boleto_pdf_available
    end
  end

  describe "historical invoice lookup" do
    it "resolves a cancelled issuance provider_invoice_id to the charge" do
      charge = create(:charge, school: school, contract: contract, guardian: guardian)
      cancelled = create(:charge_issuance, :issued, charge: charge, school: school,
                                                     provider_invoice_id: "inv-replaced")
      cancelled.cancel!
      create(:charge_issuance, :issued, charge: charge, school: school,
                                          provider_invoice_id: "inv-replacement")

      found = ChargeIssuance.find_by_provider_invoice_id!("inv-replaced")

      expect(found.charge_id).to eq(charge.id)
      expect(found.status).to eq("cancelled")
    end
  end
end
