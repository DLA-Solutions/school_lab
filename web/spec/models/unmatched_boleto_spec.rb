# frozen_string_literal: true

require "rails_helper"

RSpec.describe UnmatchedBoleto, type: :model do
  let(:school) { create(:school) }

  describe "schema" do
    it "defines the review columns" do
      expect(described_class.column_names).to include(
        "school_id", "provider", "provider_invoice_id", "payer_cpf", "payer_name",
        "amount_cents", "due_date", "provider_status", "paid_amount_cents", "paid_at",
        "payment_method", "status", "resolved_at", "resolved_by_id", "resolved_guardian_id",
        "charge_id", "created_at", "updated_at"
      )
    end

    it "defaults status to pending" do
      expect(create(:unmatched_boleto, school: school).status).to eq("pending")
    end

    it "enforces a unique provider_invoice_id per school" do
      create(:unmatched_boleto, school: school, provider_invoice_id: "dup-123")
      duplicate = build(:unmatched_boleto, school: school, provider_invoice_id: "dup-123")

      expect { duplicate.save(validate: false) }.to raise_error(ActiveRecord::RecordNotUnique)
    end

    it "allows the same provider_invoice_id to repeat across different schools" do
      other_school = create(:school)
      create(:unmatched_boleto, school: school, provider_invoice_id: "shared-id")

      duplicate = build(:unmatched_boleto, school: other_school, provider_invoice_id: "shared-id")

      expect(duplicate).to be_valid
    end

    it "rejects a negative amount_cents" do
      boleto = build(:unmatched_boleto, school: school, amount_cents: -1)

      expect { boleto.save(validate: false) }.to raise_error(ActiveRecord::StatementInvalid)
    end

    it "rejects an unsupported status" do
      boleto = build(:unmatched_boleto, school: school, status: "ignored")

      expect(boleto).not_to be_valid
      expect { boleto.save(validate: false) }.to raise_error(ActiveRecord::StatementInvalid)
    end

    it "rejects an unsupported provider_status" do
      boleto = build(:unmatched_boleto, school: school, provider_status: "mystery")

      expect(boleto).not_to be_valid
      expect { boleto.save(validate: false) }.to raise_error(ActiveRecord::StatementInvalid)
    end
  end

  describe "validations" do
    it "requires a resolved_guardian when status is resolved" do
      boleto = build(:unmatched_boleto, school: school, status: "resolved", resolved_guardian: nil)

      expect(boleto).not_to be_valid
      expect(boleto.errors[:resolved_guardian_id]).to be_present
    end

    it "does not require a resolved_guardian when dismissed" do
      boleto = build(:unmatched_boleto, :dismissed, school: school)

      expect(boleto).to be_valid
    end
  end

  describe "#pending?" do
    it "is true only while status is pending" do
      boleto = create(:unmatched_boleto, school: school)
      expect(boleto.pending?).to be(true)

      boleto.update!(status: "dismissed", resolved_at: Time.current)
      expect(boleto.pending?).to be(false)
    end
  end

  describe ".pending_review" do
    it "returns only pending rows" do
      pending = create(:unmatched_boleto, school: school)
      create(:unmatched_boleto, :dismissed, school: school)

      expect(described_class.pending_review).to contain_exactly(pending)
    end
  end

  describe "tenant isolation" do
    it "scopes unmatched boletos to a school" do
      school_one = create(:school)
      school_two = create(:school)
      boleto_one = create(:unmatched_boleto, school: school_one)
      create(:unmatched_boleto, school: school_two)

      expect(school_one.unmatched_boletos).to contain_exactly(boleto_one)
    end
  end

  describe "auditing" do
    it "audits changes associated with the school" do
      boleto = create(:unmatched_boleto, school: school)

      boleto.update!(payer_name: "Corrected Name")

      audit = boleto.audits.last
      expect(audit.associated).to eq(school)
      expect(audit.audited_changes).to include("payer_name")
    end
  end
end
