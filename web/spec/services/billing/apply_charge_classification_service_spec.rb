# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::ApplyChargeClassificationService do
  let(:school) { create(:school) }
  let(:purpose) { create(:billing_purpose, :tuition, :eligible, school: school) }
  let(:charge) { build(:charge, school: school) }

  it "copies immutable purpose classification onto the charge" do
    result = described_class.call(charge: charge, billing_purpose: purpose)

    expect(result).to be_success
    expect(charge.billing_purpose_id).to eq(purpose.id)
    expect(charge.billing_purpose_code).to eq("tuition")
    expect(charge.tax_declaration_eligible).to be(true)
  end

  it "rejects a purpose from another school" do
    other_purpose = create(:billing_purpose, :tuition, school: create(:school))

    expect(described_class.call(charge: charge, billing_purpose: other_purpose)).to be_failure
  end
end
