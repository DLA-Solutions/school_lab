# frozen_string_literal: true

require "rails_helper"

RSpec.describe ChargeIssuance, type: :model do
  let(:school) { create(:school) }
  let(:guardian) { create(:guardian, school: school) }
  let(:student) { create(:student, school: school) }
  let(:billing_plan) { create(:billing_plan, school: school) }
  let(:contract) { create(:contract, school: school, student: student, billing_plan: billing_plan) }
  let(:charge) do
    create(:charge, school: school, contract: contract, guardian: guardian,
                    total_amount_cents: 150_000, due_date: Date.new(2026, 4, 10))
  end

  describe "schema" do
    it "defines the issuance columns" do
      expect(described_class.column_names).to include(
        "charge_id", "school_id", "provider", "provider_invoice_id", "idempotency_key",
        "status", "amount_cents", "due_date", "boleto_url", "digitable_line", "barcode",
        "our_number", "pix_emv", "issued_at", "cancelled_at", "last_error",
        "created_at", "updated_at"
      )
    end

    it "enforces a partial unique index on provider_invoice_id" do
      create(:charge_issuance, :issued, charge: charge, school: school,
                                        provider_invoice_id: "inv-duplicate")

      duplicate = build(:charge_issuance, charge: charge, school: school,
                                          provider_invoice_id: "inv-duplicate")

      expect { duplicate.save(validate: false) }.to raise_error(ActiveRecord::RecordNotUnique)
    end

    it "enforces a unique index on idempotency_key" do
      create(:charge_issuance, charge: charge, school: school, idempotency_key: "same-key")

      duplicate = build(:charge_issuance, charge: charge, school: school, idempotency_key: "same-key")

      expect { duplicate.save(validate: false) }.to raise_error(ActiveRecord::RecordNotUnique)
    end

    it "rejects negative amount_cents" do
      issuance = build(:charge_issuance, charge: charge, school: school, amount_cents: -1)

      expect { issuance.save(validate: false) }.to raise_error(ActiveRecord::StatementInvalid)
    end
  end

  describe "snapshot on create" do
    it "copies amount and due date from the charge and keeps them immutable" do
      issuance = create(:charge_issuance, charge: charge, school: school)

      expect(issuance.amount_cents).to eq(150_000)
      expect(issuance.due_date).to eq(Date.new(2026, 4, 10))

      charge.update!(total_amount_cents: 200_000, due_date: Date.new(2026, 5, 1))

      expect(issuance.reload.amount_cents).to eq(150_000)
      expect(issuance.due_date).to eq(Date.new(2026, 4, 10))
    end
  end

  describe "state machine" do
    it "starts in pending" do
      issuance = create(:charge_issuance, charge: charge, school: school)

      expect(issuance.status).to eq("pending")
    end

    it "allows pending to transition to issued, failed, or cancelled" do
      pending = create(:charge_issuance, charge: charge, school: school)

      expect(pending.may_issue?).to be(true)
      expect(pending.may_mark_failed?).to be(true)
      expect(pending.may_cancel?).to be(true)
    end

    it "allows issued to transition to cancelled" do
      issuance = create(:charge_issuance, :issued, charge: charge, school: school)

      expect(issuance.may_cancel?).to be(true)
      expect(issuance.may_issue?).to be(false)
    end

    it "does not allow failed to transition to issued" do
      issuance = create(:charge_issuance, :failed, charge: charge, school: school)

      expect(issuance.may_issue?).to be(false)
      expect(issuance.issue).to be(false)
      expect(issuance.reload.status).to eq("failed")
    end

    it "prevents direct status assignment" do
      issuance = create(:charge_issuance, charge: charge, school: school)

      expect { issuance.status = "issued" }.to raise_error(AASM::NoDirectAssignmentError)
    end
  end

  describe "state timestamps" do
    it "sets issued_at and cancelled_at on transitions" do
      issuance = create(:charge_issuance, charge: charge, school: school)

      issuance.issue!
      expect(issuance.reload.issued_at).to be_present

      issuance.cancel!
      expect(issuance.reload.cancelled_at).to be_present
    end

    it "does not require failed_at when marking failed" do
      issuance = create(:charge_issuance, charge: charge, school: school)

      expect { issuance.mark_failed! }.not_to raise_error
      expect(issuance.reload.status).to eq("failed")
    end
  end

  describe "tenant isolation" do
    it "scopes issuances to a school" do
      school_one = create(:school)
      school_two = create(:school)
      charge_one = create(:charge, school: school_one)
      charge_two = create(:charge, school: school_two)
      issuance_one = create(:charge_issuance, charge: charge_one, school: school_one)
      create(:charge_issuance, charge: charge_two, school: school_two)

      expect(school_one.charge_issuances).to contain_exactly(issuance_one)
    end
  end

  describe "auditing" do
    it "audits changes associated with the school" do
      issuance = create(:charge_issuance, charge: charge, school: school)

      issuance.update!(last_error: "Provider rejected request")

      audit = issuance.audits.last
      expect(audit.associated).to eq(school)
      expect(audit.audited_changes).to include("last_error")
    end
  end

  describe ".find_by_provider_invoice_id!" do
    it "finds an issuance by provider invoice id" do
      issuance = create(:charge_issuance, :issued, charge: charge, school: school,
                                                    provider_invoice_id: "inv-old-123")

      found = described_class.find_by_provider_invoice_id!("inv-old-123")

      expect(found).to eq(issuance)
      expect(found.charge_id).to eq(charge.id)
    end
  end
end
