# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::UnissuedCharges do
  let(:school) { create(:school) }

  it "finds never-attempted and permanently failed charges within the due window" do
    create(:charge, school: school, due_date: 3.days.from_now.to_date)
    failed_charge = create(:charge, school: school, due_date: 3.days.from_now.to_date)
    create(:charge_issuance, :failed, charge: failed_charge, school: school)

    result = described_class.for(school, due_within: 3.days)

    expect(result.fetch(:never_attempted).size).to eq(1)
    expect(result.fetch(:permanently_failed).map(&:id)).to include(failed_charge.id)
  end

  it "reports charges whose issuance is stuck pending" do
    stuck_charge = create(:charge, school: school, due_date: 3.days.from_now.to_date)
    create(:charge_issuance, charge: stuck_charge, school: school)

    result = described_class.for(school, due_within: 3.days)

    expect(result.fetch(:stuck_pending).map(&:id)).to eq([ stuck_charge.id ])
    expect(result.fetch(:never_attempted)).to be_empty
    expect(result.fetch(:permanently_failed)).to be_empty
  end

  it "does not report charges with an issued invoice" do
    create(:charge, :issued, school: school, due_date: 3.days.from_now.to_date)

    result = described_class.for(school, due_within: 3.days)

    expect(result.values.flatten).to be_empty
  end
end
