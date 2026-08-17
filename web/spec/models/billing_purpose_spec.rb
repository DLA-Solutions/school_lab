# frozen_string_literal: true

require "rails_helper"

RSpec.describe BillingPurpose, type: :model do
  subject(:purpose) { build(:billing_purpose, :tuition) }

  it "requires code and name" do
    purpose = build(:billing_purpose, :tuition, code: nil, name: nil)

    expect(purpose).not_to be_valid
    expect(purpose.errors[:code]).to be_present
    expect(purpose.errors[:name]).to be_present
  end

  it "restricts code to known billing purpose codes" do
    purpose = build(:billing_purpose, :tuition, code: "unknown")

    expect(purpose).not_to be_valid
    expect(purpose.errors[:code]).to be_present
  end

  describe ".provision_defaults!" do
    let(:school) { create(:school) }

    it "creates tuition and enrollment purposes disabled for release" do
      purposes = described_class.provision_defaults!(school)

      expect(purposes.map(&:code)).to contain_exactly("tuition", "enrollment")
      expect(purposes).to all(have_attributes(tax_declaration_eligible: false))
    end

    it "is idempotent" do
      described_class.provision_defaults!(school)
      expect { described_class.provision_defaults!(school) }.not_to change(described_class, :count)
    end
  end
end
