# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::PurposeConfigurationDigest do
  let(:school) { create(:school) }

  it "changes when eligibility changes" do
    tuition = create(:billing_purpose, :tuition, school: school, tax_declaration_eligible: false)
    create(:billing_purpose, :enrollment, school: school, tax_declaration_eligible: false)

    first = described_class.compute(school.billing_purposes.kept.ordered)
    tuition.update!(tax_declaration_eligible: true)
    second = described_class.compute(school.billing_purposes.kept.ordered)

    expect(second).not_to eq(first)
  end
end
